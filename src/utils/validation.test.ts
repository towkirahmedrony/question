import test from 'node:test';
import assert from 'node:assert/strict';
import type { QuestionItem } from '../types/question.ts';
import {
  buildImportPayload,
  formatQuestionForExport,
  validateForImport,
  validateQuestion,
} from './validation.ts';

const question = (overrides: Partial<QuestionItem> = {}): QuestionItem => ({
  id: 'q_test_1',
  type: 'mcq',
  body: { text_bn: 'প্রশ্ন', text_en: 'Question', image_url: null },
  options: [
    { id: 1, text_bn: 'ক', text_en: 'A', isCorrect: false },
    { id: 2, text_bn: 'খ', text_en: 'B', isCorrect: true },
    { id: 3, text_bn: 'গ', text_en: 'C', isCorrect: false },
    { id: 4, text_bn: 'ঘ', text_en: 'D', isCorrect: false },
  ],
  explanation: { bn: 'ব্যাখ্যা', en: 'Explanation' },
  difficulty_level: 'medium',
  source_type: 'board_exam',
  exam_references: [
    { source_kind: 'board', board: 'Dhaka Board', year: '2024', eiin: '91000002' },
  ],
  tags: ['vector'],
  subject_id: 'sub_physics',
  chapter_id: 'chap_vectors',
  topic_id: 'top_dot',
  validation_status: 'valid',
  validation_errors: [],
  validation_warnings: [],
  reviewed: true,
  ...overrides,
});

test('validateForImport accepts an admin-compatible question', () => {
  const result = validateForImport(question());

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.status, 'valid');
});

test('validateForImport requires the curriculum scope and English text', () => {
  const result = validateForImport(
    question({
      body: { text_bn: 'প্রশ্ন', text_en: '', image_url: null },
      subject_id: undefined,
      chapter_id: undefined,
    })
  );

  assert.equal(result.status, 'invalid');
  assert.ok(result.errors.some((error) => error.includes('text_en')));
  assert.ok(result.errors.some((error) => error.includes('subject')));
  assert.ok(result.errors.some((error) => error.includes('chapter')));
});

test('validateForImport requires exactly one correct option', () => {
  const none = question({
    options: question().options.map((option) => ({ ...option, isCorrect: false })),
  });
  const many = question({
    options: question().options.map((option) => ({ ...option, isCorrect: true })),
  });

  assert.ok(validateForImport(none).errors.some((error) => error.includes('correct')));
  assert.ok(validateForImport(many).errors.some((error) => error.includes('Exactly one')));
});

test('validateForImport rejects unsupported source, difficulty and reference values', () => {
  const result = validateForImport(
    question({
      source_type: 'rumour' as never,
      difficulty_level: 'impossible' as never,
      exam_references: [
        { source_kind: 'unknown' },
        { source_kind: 'board', board: 'Dhaka Board', year: 'circa' },
      ],
    })
  );

  assert.ok(result.errors.some((error) => error.includes('source type')));
  assert.ok(result.errors.some((error) => error.includes('difficulty')));
  assert.ok(result.errors.some((error) => error.includes('Reference #1')));
  assert.ok(result.warnings.some((warning) => warning.includes('4-digit year')));
});

test('validateQuestion keeps the Phase 2 rule set (taxonomy is only a warning)', () => {
  const result = validateQuestion(question({ subject_id: undefined, chapter_id: undefined }));

  assert.equal(result.status, 'warning');
  assert.ok(result.warnings.includes('Subject not assigned.'));
  assert.ok(result.warnings.includes('Chapter not assigned.'));
});

test('the export payload carries the admin panel field names and structured references', () => {
  const payload = buildImportPayload(question());

  assert.equal(payload.type, 'mcq');
  assert.deepEqual(Object.keys(payload).sort(), [
    'body',
    'chapter_id',
    'difficulty_level',
    'exam_references',
    'explanation',
    'options',
    'source_type',
    'subject_id',
    'tags',
    'topic_id',
    'type',
  ]);
  assert.deepEqual(payload.exam_references, [
    { source_kind: 'board', board: 'Dhaka Board', year: '2024', eiin: '91000002' },
  ]);
  assert.equal(payload.subject_id, 'sub_physics');
  assert.equal(payload.chapter_id, 'chap_vectors');
});

test('isCorrect is preserved exactly and option ids follow the submitted order', () => {
  const payload = buildImportPayload(
    question({
      options: [
        { id: 7, text_bn: 'ক', text_en: 'A', isCorrect: true },
        { id: 2, text_bn: 'খ', text_en: 'B', isCorrect: false },
      ],
    })
  );

  assert.deepEqual(
    payload.options.map((option) => ({ id: option.id, isCorrect: option.isCorrect })),
    [
      { id: 1, isCorrect: true },
      { id: 2, isCorrect: false },
    ]
  );
});

test('empty references are exported as an empty array and tags are de-duplicated', () => {
  const exported = formatQuestionForExport(
    question({ exam_references: [], tags: ['vector', ' vector ', 'dot'] })
  );

  assert.deepEqual(exported.exam_references, []);
  assert.deepEqual(exported.tags, ['vector', 'dot']);
});

test('a missing scope is submitted as an empty string so the backend rejects it explicitly', () => {
  const payload = buildImportPayload(question({ subject_id: undefined }));

  assert.equal(payload.subject_id, '');
});
