import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_IMAGE_BYTES,
  normalizeImageMimeType,
  validateImageFile,
} from './imageValidation.ts';

const image = (overrides: { name?: string; type?: string; size?: number } = {}) => ({
  name: 'page.jpg',
  type: 'image/jpeg',
  size: 1024,
  ...overrides,
});

test('accepts the formats the extractor supports', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    assert.deepEqual(validateImageFile(image({ type })), { ok: true });
  }
});

test('accepts the legacy image/jpg alias', () => {
  assert.deepEqual(validateImageFile(image({ type: 'image/jpg' })), { ok: true });
  assert.equal(normalizeImageMimeType('image/JPG'), 'image/jpeg');
});

test('rejects unsupported file types', () => {
  assert.deepEqual(validateImageFile(image({ type: 'image/gif' })), {
    ok: false,
    reason: 'type',
  });
  assert.deepEqual(validateImageFile(image({ type: 'application/pdf' })), {
    ok: false,
    reason: 'type',
  });
  assert.deepEqual(validateImageFile(image({ type: '' })), { ok: false, reason: 'type' });
});

test('rejects an empty file and a file above the 6MB limit', () => {
  assert.deepEqual(validateImageFile(image({ size: 0 })), { ok: false, reason: 'empty' });
  assert.deepEqual(validateImageFile(image({ size: MAX_IMAGE_BYTES + 1 })), {
    ok: false,
    reason: 'size',
  });
  assert.deepEqual(validateImageFile(image({ size: MAX_IMAGE_BYTES })), { ok: true });
});
