import test from 'node:test';
import assert from 'node:assert/strict';
import { countQuestionBlocks, looksLikePlainText } from './plainText.ts';

test('counts one block per --- separated question', () => {
  const text = `Q_EN: One
ANS: A

---

Q_EN: Two
ANS: B

---
Q_BN: তিন
Q_EN: Three
ANS: C`;

  assert.equal(countQuestionBlocks(text), 3);
});

test('counts a single question without separators', () => {
  assert.equal(countQuestionBlocks('Q_BN: প্রশ্ন?\nANS: A'), 1);
});

test('ignores metadata-only blocks', () => {
  assert.equal(countQuestionBlocks('@institution: University of Dhaka\n@year: 2024-25'), 0);
});

test('looksLikePlainText requires a question and an answer', () => {
  assert.equal(looksLikePlainText('Q_EN: One\nANS: A'), true);
  assert.equal(looksLikePlainText('Q_EN: One'), false);
  assert.equal(looksLikePlainText(''), false);
});
