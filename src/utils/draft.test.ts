import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_DRAFT_CHARS, parseImporterDraft } from './draft.ts';

const draft = {
  version: 1,
  savedAt: '2026-11-04T09:00:00.000Z',
  pastedText: 'Question one',
  plainText: 'Q_BN: প্রশ্ন',
};

test('restores a valid draft', () => {
  assert.deepEqual(parseImporterDraft(JSON.stringify(draft)), draft);
});

test('rejects malformed, unsupported and empty drafts', () => {
  assert.equal(parseImporterDraft(null), null);
  assert.equal(parseImporterDraft('not json'), null);
  assert.equal(parseImporterDraft(JSON.stringify({ ...draft, version: 2 })), null);
  assert.equal(parseImporterDraft(JSON.stringify({ ...draft, savedAt: 'yesterday' })), null);
  assert.equal(parseImporterDraft(JSON.stringify({ ...draft, pastedText: 1 })), null);
  assert.equal(parseImporterDraft(JSON.stringify({ ...draft, pastedText: '  ', plainText: '' })), null);
});

test('ignores a draft larger than the storage budget', () => {
  const oversized = {
    ...draft,
    plainText: 'x'.repeat(MAX_DRAFT_CHARS + 1),
  };

  assert.equal(parseImporterDraft(JSON.stringify(oversized)), null);
});
