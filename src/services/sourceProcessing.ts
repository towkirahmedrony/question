import type { ImportSourceKind, PreparedUnit } from '../types/import';
import { renderImageToJpeg } from '../utils/imageProcessing.ts';

/**
 * Client-side content extraction for every supported input.
 *
 * TXT, CSV and text PDFs become readable text; scanned PDF pages and photos
 * become downscaled JPEG page images. Nothing here talks to a server: the
 * Porokh backend never receives the original file.
 */

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
export const MAX_PDF_BYTES = 25 * 1024 * 1024;
export const MAX_TEXT_FILE_BYTES = 10 * 1024 * 1024;

/** Kept below the backend's 120k text budget so a chunk always fits. */
export const TEXT_CHUNK_CHARS = 40_000;

/** A page with less readable text than this is treated as a scan. */
const SCANNED_PAGE_MIN_CHARS = 60;

/**
 * True when a PDF page yielded real text. Broken font encodings often return
 * replacement characters or symbol soup that is longer than the minimum, so a
 * length check alone would skip the OCR path for a Bangla scan.
 */
export const pdfPageTextIsReadable = (
  text: string,
  minChars = SCANNED_PAGE_MIN_CHARS
): boolean => {
  const compact = text.replace(/\s/g, '');
  if (compact.length < minChars) return false;
  if (compact.includes('\uFFFD')) return false;

  const letterish = (compact.match(/[\p{L}\p{N}]/gu) ?? []).length;
  return letterish / compact.length >= 0.5;
};

export type FileValidation =
  | { kind: ImportSourceKind; mimeType: string }
  | { kind?: undefined; error: string };

const extensionOf = (name: string): string => {
  const index = name.lastIndexOf('.');
  return index === -1 ? '' : name.slice(index + 1).toLowerCase();
};

/** Validates a picked file and reports what kind of input it is. */
export const classifyFile = (file: { name: string; type: string; size: number }): FileValidation => {
  const ext = extensionOf(file.name);
  const mime = file.type.toLowerCase();

  if (file.size === 0) return { error: `"${file.name}" is empty.` };

  const isImage =
    mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
  if (isImage) {
    if (mime === 'image/gif' || mime === 'image/heic' || ['gif', 'heic', 'heif'].includes(ext)) {
      return { error: `"${file.name}" is not supported. Use JPG, PNG or WEBP images.` };
    }
    if (!['image/jpeg', 'image/png', 'image/webp', ''].includes(mime)) {
      return { error: `"${file.name}" is not a supported image. Use JPG, PNG or WEBP.` };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { error: `"${file.name}" is larger than 6MB. Use a smaller image.` };
    }
    return { kind: 'image', mimeType: mime || 'image/jpeg' };
  }

  if (mime === 'application/pdf' || ext === 'pdf') {
    if (file.size > MAX_PDF_BYTES) {
      return { error: `"${file.name}" is larger than 25MB. Split the PDF into smaller files.` };
    }
    return { kind: 'pdf', mimeType: 'application/pdf' };
  }

  if (mime.includes('csv') || ext === 'csv') {
    if (file.size > MAX_TEXT_FILE_BYTES) {
      return { error: `"${file.name}" is larger than 10MB. Split the CSV into smaller files.` };
    }
    return { kind: 'csv', mimeType: 'text/csv' };
  }

  if (mime.startsWith('text/') || ext === 'txt') {
    if (file.size > MAX_TEXT_FILE_BYTES) {
      return { error: `"${file.name}" is larger than 10MB. Split the text file into smaller files.` };
    }
    return { kind: 'txt', mimeType: 'text/plain' };
  }

  if (['xlsx', 'xls', 'doc', 'docx'].includes(ext)) {
    return { error: `"${file.name}" is not supported. Export it as CSV (UTF-8) and try again.` };
  }

  return { error: `"${file.name}" is not a supported file. Use images, PDF, CSV or TXT.` };
};

/** Reads a TXT/CSV file as UTF-8 text. */
export const readTextFile = async (file: File): Promise<string> => {
  const text = await file.text();
  return text.replace(/^\uFEFF/, '');
};

/**
 * RFC 4180 CSV reader: quoted fields, escaped double quotes, commas and
 * newlines inside cells, CRLF or LF line endings.
 */
export const parseCsv = (input: string): string[][] => {
  const text = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      if (field.trim() !== '') field += char;
      else quoted = true;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);

  return rows;
};

const normalizeHeader = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, '')
    .replace(/\s+/g, '_');

const findColumn = (headers: string[], aliases: string[]): number => {
  for (const alias of aliases) {
    const index = headers.indexOf(alias);
    if (index !== -1) return index;
  }
  return -1;
};

const cell = (row: string[], index: number): string =>
  index === -1 ? '' : (row[index] ?? '').trim();

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const optionAliases = (position: number, suffix: 'bn' | 'en'): string[] => {
  const number = position + 1;
  const letter = OPTION_LETTERS[position].toLowerCase();
  return [
    `opt_${number}_${suffix}`,
    `option_${number}_${suffix}`,
    `option${number}_${suffix}`,
    `opt${number}_${suffix}`,
    `${letter}_${suffix}`,
  ];
};

const formatExamReferences = (raw: string): string => {
  if (!raw) return '';

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return raw;

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return '';
        const record = entry as Record<string, unknown>;
        const parts = [
          record.institution_name,
          record.exam_name,
          record.unit_name,
          record.year,
        ]
          .filter((part): part is string => typeof part === 'string' && part.trim() !== '');
        return parts.join(', ');
      })
      .filter(Boolean)
      .join('; ');
  } catch {
    return raw;
  }
};

/**
 * Turns CSV rows into readable blocks for the AI.
 *
 * A header row is required. When question columns are recognised the rows are
 * rendered as question/option/answer blocks (mixed Bangla and English columns
 * included); otherwise each row becomes `header: value` lines so no content is
 * lost. `correct_opt` is 1-based, matching the admin CSV format.
 */
export const csvToReadableText = (input: string): string => {
  const rows = parseCsv(input);
  if (rows.length === 0) return '';

  const headers = rows[0].map(normalizeHeader);
  const questionBn = findColumn(headers, ['q_bn', 'q_text_bn', 'question_bn', 'question_bengali']);
  const questionEn = findColumn(headers, [
    'q_en',
    'q_text_en',
    'question_en',
    'question_english',
    'question',
  ]);
  const answer = findColumn(headers, [
    'correct_opt',
    'correct_option',
    'ans',
    'answer',
    'correct_answer',
    'answer_key',
  ]);
  const explanationBn = findColumn(headers, ['exp_bn', 'explanation_bn']);
  const explanationEn = findColumn(headers, ['exp_en', 'explanation_en', 'explanation']);
  const difficulty = findColumn(headers, ['difficulty', 'diff']);
  const tags = findColumn(headers, ['tags']);
  const sourceType = findColumn(headers, ['source_type', 'source', 'type']);
  const institution = findColumn(headers, ['institution', 'institution_name']);
  const exam = findColumn(headers, ['exam', 'exam_name']);
  const unit = findColumn(headers, ['unit', 'unit_name']);
  const session = findColumn(headers, ['session', 'admission_session']);
  const year = findColumn(headers, ['year']);
  const references = findColumn(headers, ['exam_references']);

  const hasQuestionColumn = questionBn !== -1 || questionEn !== -1;
  const body = rows.slice(1);

  if (!hasQuestionColumn) {
    return body
      .map((row) =>
        headers
          .map((header, index) => {
            const value = cell(row, index);
            return value ? `${header || `column_${index + 1}`}: ${value}` : '';
          })
          .filter(Boolean)
          .join('\n')
      )
      .filter(Boolean)
      .join('\n\n');
  }

  const blocks: string[] = [];

  body.forEach((row, index) => {
    const bn = cell(row, questionBn);
    const en = cell(row, questionEn);
    if (!bn && !en) return;

    const lines: string[] = [`CSV row ${index + 1}`];
    if (bn) lines.push(`Question (Bengali): ${bn}`);
    if (en) lines.push(`Question (English): ${en}`);

    OPTION_LETTERS.forEach((letter, position) => {
      const bnOption = cell(row, findColumn(headers, optionAliases(position, 'bn')));
      const enOption = cell(row, findColumn(headers, optionAliases(position, 'en')));
      if (!bnOption && !enOption) return;

      const parts = [bnOption, enOption].filter(Boolean).join(' / ');
      lines.push(`Option ${letter}: ${parts}`);
    });

    const correct = cell(row, answer);
    if (correct) {
      const numeric = Number(correct);
      const resolved =
        Number.isInteger(numeric) && numeric >= 1 && numeric <= OPTION_LETTERS.length
          ? OPTION_LETTERS[numeric - 1]
          : correct;
      lines.push(`Correct answer: ${resolved}`);
    }

    if (cell(row, explanationBn)) lines.push(`Explanation (Bengali): ${cell(row, explanationBn)}`);
    if (cell(row, explanationEn)) lines.push(`Explanation (English): ${cell(row, explanationEn)}`);
    if (cell(row, difficulty)) lines.push(`Difficulty: ${cell(row, difficulty)}`);
    if (cell(row, tags)) lines.push(`Tags: ${cell(row, tags)}`);
    if (cell(row, sourceType)) lines.push(`Source type: ${cell(row, sourceType)}`);
    if (cell(row, institution)) lines.push(`Institution: ${cell(row, institution)}`);
    if (cell(row, exam)) lines.push(`Exam: ${cell(row, exam)}`);
    if (cell(row, unit)) lines.push(`Unit: ${cell(row, unit)}`);
    if (cell(row, session)) lines.push(`Session: ${cell(row, session)}`);
    if (cell(row, year)) lines.push(`Year: ${cell(row, year)}`);
    if (cell(row, references)) {
      const formatted = formatExamReferences(cell(row, references));
      if (formatted) lines.push(`Exam reference: ${formatted}`);
    }

    blocks.push(lines.join('\n'));
  });

  return blocks.join('\n\n');
};

/**
 * Splits long text on line boundaries so each extraction call fits the model
 * budget. A single oversized line is hard-sliced.
 */
export const chunkText = (text: string, maxChars = TEXT_CHUNK_CHARS): string[] => {
  if (text.trim() === '') return [];
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let current = '';

  const push = () => {
    if (current.trim() !== '') chunks.push(current);
    current = '';
  };

  for (const line of text.split('\n')) {
    if (line.length > maxChars) {
      push();
      for (let offset = 0; offset < line.length; offset += maxChars) {
        chunks.push(line.slice(offset, offset + maxChars));
      }
      continue;
    }

    if (current && current.length + line.length + 1 > maxChars) push();
    current = current ? `${current}\n${line}` : line;
  }

  push();
  return chunks;
};

/** Joins extraction results without losing the block separator. */
export const mergePlainTextParts = (parts: string[]): string =>
  parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n\n---\n\n') + (parts.some((part) => part.trim()) ? '\n' : '');

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.includes(';base64,') ? result.split(';base64,')[1] : result);
    };
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.readAsDataURL(blob);
  });

/**
 * Downscales a photo for extraction. Mobile cameras produce very large files;
 * capping the long edge keeps the request small without losing readable text.
 */
export const prepareImage = async (
  file: File,
  maxEdge = 1800
): Promise<{ mime_type: string; data: string }> => {
  const blob = await renderImageToJpeg(file, maxEdge);

  return { mime_type: 'image/jpeg', data: await blobToBase64(blob) };
};

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

const loadPdfJs = async (): Promise<typeof import('pdfjs-dist')> => {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist');
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    })().catch((error) => {
      pdfjsPromise = null;
      throw error;
    });
  }

  return pdfjsPromise;
};

const pdfErrorMessage = (error: unknown): string => {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : '';

  if (name === 'PasswordException' || /password/i.test(message)) {
    return 'This PDF is password protected. Remove the password and try again.';
  }

  if (name === 'InvalidPDFException' || /invalid pdf/i.test(message)) {
    return 'This PDF is damaged or not a valid PDF file.';
  }

  return 'The PDF could not be read. Try another file or export its pages as images.';
};

export interface PdfExtractOptions {
  /** Must match the ImportSource id so failures can update that row. */
  sourceId?: string;
  signal?: AbortSignal;
  onProgress?: (message: string) => void;
}

const throwIfAborted = (signal?: AbortSignal): void => {
  if (!signal?.aborted) return;

  const error = new Error('The PDF read was cancelled.');
  error.name = 'AbortError';
  throw error;
};

/**
 * Extracts one source into extraction units.
 *
 * Text-based pages produce text units. A page with almost no text (a scan or a
 * photo-only page) is rendered to a JPEG image unit, so scanned PDFs still work
 * without any PDF processing on the server. Page order is preserved.
 */
export const extractPdfUnits = async (
  file: File,
  options: PdfExtractOptions = {}
): Promise<PreparedUnit[]> => {
  const pdfjs = await loadPdfJs();
  const sourceId = options.sourceId ?? `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    throwIfAborted(options.signal);
    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjs.getDocument({ data });
    const pdfDocument = await loadingTask.promise;
    const units: PreparedUnit[] = [];

    try {
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        throwIfAborted(options.signal);
        options.onProgress?.(`Reading PDF page ${pageNumber} of ${pdfDocument.numPages}...`);
        const page = await pdfDocument.getPage(pageNumber);

        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ('str' in item ? `${item.str}${item.hasEOL ? '\n' : ' '}` : ''))
          .join('')
          .replace(/[ \t]+\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        if (pdfPageTextIsReadable(pageText)) {
          units.push({
            id: `${sourceId}_page_${pageNumber}`,
            sourceId,
            name: `${file.name} · page ${pageNumber}`,
            kind: 'text',
            text: `PDF page ${pageNumber} of ${pdfDocument.numPages}:\n${pageText}`,
          });
          continue;
        }

        options.onProgress?.(`Rendering scanned PDF page ${pageNumber} of ${pdfDocument.numPages}...`);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(2.5, Math.max(1, 1600 / Math.max(base.width, 1)));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);

        const context = canvas.getContext('2d');
        if (!context) throw new Error('The browser could not render the PDF page.');

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: context, viewport, canvas }).promise;

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.85)
        );
        if (!blob) throw new Error(`Page ${pageNumber} could not be rendered.`);

        units.push({
          id: `${sourceId}_page_${pageNumber}`,
          sourceId,
          name: `${file.name} · page ${pageNumber}`,
          kind: 'image',
          mime_type: 'image/jpeg',
          data: await blobToBase64(blob),
        });
      }
    } finally {
      await loadingTask.destroy();
    }

    return units;
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error.message.startsWith('The browser could not'))) {
      throw error;
    }
    throw new Error(pdfErrorMessage(error));
  }
};
