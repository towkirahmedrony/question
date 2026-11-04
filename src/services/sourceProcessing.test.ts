import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_IMAGE_BYTES,
  chunkText,
  classifyFile,
  csvToReadableText,
  mergePlainTextParts,
  parseCsv,
  pdfPageTextIsReadable,
} from './sourceProcessing.ts';

const file = (overrides: { name?: string; type?: string; size?: number } = {}) => ({
  name: 'questions.csv',
  type: 'text/csv',
  size: 1024,
  ...overrides,
});

test('parseCsv handles quoted commas, escaped quotes and multiline cells', () => {
  const rows = parseCsv(
    'name,question\r\n1,"কোষ, ঝিল্লি","সাইটোপ্লাজমের ""সুতা""\nদ্বিতীয় লাইন"\n\n2,simple,two\n'
  );

  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], ['name', 'question']);
  assert.deepEqual(rows[1], ['1', 'কোষ, ঝিল্লি', 'সাইটোপ্লাজমের "সুতা"\nদ্বিতীয় লাইন']);
  assert.deepEqual(rows[2], ['2', 'simple', 'two']);
});

test('csvToReadableText maps the admin CSV columns into a readable question block', () => {
  const csv = [
    'q_text_bn,q_text_en,opt_1_bn,opt_1_en,opt_2_bn,opt_2_en,correct_opt,exp_bn,exp_en,difficulty,tags',
    '"রাজধানী কোনটি?","What is the capital?",ঢাকা,Dhaka,খুলনা,Khulna,1,ঢাকা রাজধানী,Dhaka is the capital,easy,"geography,capital"',
  ].join('\n');

  const text = csvToReadableText(csv);

  assert.ok(text.includes('Question (Bengali): রাজধানী কোনটি?'));
  assert.ok(text.includes('Question (English): What is the capital?'));
  assert.ok(text.includes('Option A: ঢাকা / Dhaka'));
  assert.ok(text.includes('Option B: খুলনা / Khulna'));
  assert.ok(text.includes('Correct answer: A'));
  assert.ok(text.includes('Explanation (Bengali): ঢাকা রাজধানী'));
  assert.ok(text.includes('Difficulty: easy'));
  assert.ok(text.includes('Tags: geography,capital'));
  assert.ok(!text.includes('Option C'));
});

test('csvToReadableText preserves admission institution, unit and session metadata', () => {
  const csv = [
    'q_text_bn,q_text_en,opt_1_bn,opt_1_en,opt_2_bn,opt_2_en,correct_opt,source_type,institution_name,unit_name,session',
    'প্রশ্ন?,Question?,হ্যাঁ,Yes,না,No,1,admission,University of Dhaka,A,2025-26',
  ].join('\n');

  const text = csvToReadableText(csv);

  assert.ok(text.includes('Source type: admission'));
  assert.ok(text.includes('Institution: University of Dhaka'));
  assert.ok(text.includes('Unit: A'));
  assert.ok(text.includes('Session: 2025-26'));
});

test('csvToReadableText keeps rows intact when the headers are not recognised', () => {
  const text = csvToReadableText('serial,note\n1,hello\n2,"world, again"');

  assert.equal(text, 'serial: 1\nnote: hello\n\nserial: 2\nnote: world, again');
});

test('csvToReadableText ignores rows without question text', () => {
  const text = csvToReadableText('q_text_bn,q_text_en\n,only english\n,\n');
  assert.ok(text.includes('Question (English): only english'));
  assert.equal(text.includes('CSV row 2'), false);
});

test('chunkText splits on line boundaries and loses no content', () => {
  const text = Array.from({ length: 40 }, (_, index) => `line ${index}`).join('\n');
  const chunks = chunkText(text, 100);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 100));
  assert.equal(chunks.join('\n'), text);
});

test('chunkText hard-slices a single oversized line', () => {
  const chunks = chunkText('x'.repeat(250), 100);

  assert.deepEqual(
    chunks.map((chunk) => chunk.length),
    [100, 100, 50]
  );
  assert.equal(chunks.join(''), 'x'.repeat(250));
});

test('chunkText returns nothing for empty text', () => {
  assert.deepEqual(chunkText('   '), []);
});

test('mergePlainTextParts inserts one block separator and drops empty parts', () => {
  assert.equal(mergePlainTextParts(['Q_EN: One', '  ', 'Q_EN: Two\n']), 'Q_EN: One\n\n---\n\nQ_EN: Two\n');
  assert.equal(mergePlainTextParts([]), '');
  assert.equal(mergePlainTextParts(['  ']), '');
});

test('classifyFile accepts every supported input kind', () => {
  assert.equal(classifyFile(file({ name: 'paper.pdf', type: 'application/pdf' })).kind, 'pdf');
  assert.equal(classifyFile(file({ name: 'paper.txt', type: 'text/plain' })).kind, 'txt');
  assert.equal(classifyFile(file({ name: 'paper.csv', type: '' })).kind, 'csv');
  assert.equal(classifyFile(file({ name: 'page.png', type: 'image/png' })).kind, 'image');
});

test('classifyFile rejects unsupported, empty and oversized files with a clear reason', () => {
  const xlsx = classifyFile(file({ name: 'questions.xlsx', type: '' }));
  assert.ok('error' in xlsx);
  assert.match(xlsx.error, /Export it as CSV/);

  const gif = classifyFile(file({ name: 'page.gif', type: 'image/gif' }));
  assert.ok('error' in gif);
  assert.match(gif.error, /JPG, PNG or WEBP/);

  const empty = classifyFile(file({ size: 0 }));
  assert.ok('error' in empty);
  assert.match(empty.error, /empty/);

  const oversized = classifyFile(
    file({ name: 'page.jpg', type: 'image/jpeg', size: MAX_IMAGE_BYTES + 1 })
  );
  assert.ok('error' in oversized);
  assert.match(oversized.error, /larger than 6MB/);
});


test('pdfPageTextIsReadable separates real text pages from scans', () => {
  assert.equal(pdfPageTextIsReadable(''), false);
  assert.equal(pdfPageTextIsReadable('too short'), false);
  assert.equal(pdfPageTextIsReadable('\uFFFD'.repeat(80)), false);
  assert.equal(pdfPageTextIsReadable('!@#$%^&*()'.repeat(12)), false);
  assert.equal(
    pdfPageTextIsReadable(
      '১. কোষ ঝিল্লির মোট শুষ্ক ওজনের কত ভাগ লিপিড? What percentage of the cell membrane is lipid?'
    ),
    true
  );
});
