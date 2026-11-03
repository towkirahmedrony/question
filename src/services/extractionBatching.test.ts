import test from 'node:test';
import assert from 'node:assert/strict';
import type { PreparedUnit } from '../types/import.ts';
import {
  MAX_BATCH_IMAGE_BYTES,
  MAX_BATCH_SOURCES,
  MAX_BATCH_TEXT_CHARS,
  buildExtractionBatches,
  estimateBase64Bytes,
} from './extractionBatching.ts';

const textUnit = (id: string, chars: number): PreparedUnit => ({
  id,
  sourceId: id,
  name: id,
  kind: 'text',
  text: 'x'.repeat(chars),
});

const imageUnit = (id: string, bytes: number): PreparedUnit => ({
  id,
  sourceId: id,
  name: id,
  kind: 'image',
  mime_type: 'image/jpeg',
  data: 'A'.repeat(Math.ceil((bytes * 4) / 3)),
});

test('packs consecutive text chunks up to the source and character limits', () => {
  const batches = buildExtractionBatches([
    textUnit('a', 40_000),
    textUnit('b', 40_000),
    textUnit('c', 40_000),
    textUnit('d', 40_000),
  ]);

  assert.equal(batches.length, 2);
  assert.equal(batches[0].units.length, 3);
  assert.equal(batches[1].units.length, 1);
  assert.ok(batches[0].units.reduce((total, unit) => total + (unit.text?.length ?? 0), 0) <= MAX_BATCH_TEXT_CHARS);
});

test('never puts more than the server source cap into one request', () => {
  const units = Array.from({ length: MAX_BATCH_SOURCES + 3 }, (_, index) =>
    imageUnit(`page-${index}`, 1024)
  );

  const batches = buildExtractionBatches(units);

  assert.equal(batches.length, 2);
  assert.equal(batches[0].units.length, MAX_BATCH_SOURCES);
  assert.equal(batches[1].units.length, 3);
});

test('keeps a request under the image byte budget', () => {
  const half = Math.floor(MAX_BATCH_IMAGE_BYTES / 2) - 1024;
  const batches = buildExtractionBatches([
    imageUnit('one', half),
    imageUnit('two', half),
    imageUnit('three', half),
  ]);

  assert.equal(batches.length, 2);
  assert.equal(batches[0].units.length, 2);
  assert.equal(batches[1].units[0].id, 'three');
});

test('keeps source order and labels multi-unit batches', () => {
  const batches = buildExtractionBatches([textUnit('first', 90_000), textUnit('second', 90_000)]);

  assert.deepEqual(
    batches.map((batch) => batch.units.map((unit) => unit.id)),
    [['first'], ['second']]
  );
  assert.equal(batches.length, 2);
  assert.equal(buildExtractionBatches([textUnit('solo', 10)])[0].label, 'solo');
  assert.equal(buildExtractionBatches([textUnit('a', 10), textUnit('b', 10)])[0].label, 'a (+1 more)');
});

test('estimateBase64Bytes accounts for the base64 expansion', () => {
  assert.equal(estimateBase64Bytes('QUJD'), 3);
});
