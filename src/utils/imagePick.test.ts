import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyImagePickError,
  extensionForImageMime,
  pickedImageName,
} from './imagePick.ts';

test('maps cancellation without treating it as a failure', () => {
  assert.equal(classifyImagePickError(new Error('User cancelled photos app')), 'cancelled');
  assert.equal(classifyImagePickError(new Error('Picker dismissed')), 'cancelled');
  assert.equal(classifyImagePickError(new Error('USER CANCELED')), 'cancelled');
});

test('maps permission denial and unavailable plugins', () => {
  assert.equal(classifyImagePickError(new Error('User denied access to camera')), 'denied');
  assert.equal(classifyImagePickError(new Error('Missing photos permission')), 'denied');
  assert.equal(classifyImagePickError(new Error('Camera not available on this device')), 'unavailable');
  assert.equal(classifyImagePickError(new Error('Not implemented on web')), 'unavailable');
  assert.equal(classifyImagePickError(new Error('Something else broke')), 'failed');
  assert.equal(classifyImagePickError(undefined), 'failed');
});

test('uses the canonical extension for each accepted image type', () => {
  assert.equal(extensionForImageMime('image/jpeg'), 'jpg');
  assert.equal(extensionForImageMime('image/jpg'), 'jpg');
  assert.equal(extensionForImageMime('image/png'), 'png');
  assert.equal(extensionForImageMime('image/webp'), 'webp');
  assert.equal(extensionForImageMime('image/heic'), 'jpg');
});

test('names picked photos deterministically and keeps selection order', () => {
  const now = new Date('2026-11-04T09:05:06.000Z');

  assert.equal(pickedImageName('camera', 0, 'image/jpeg', now), 'camera-20261104T090506-1.jpg');
  assert.equal(pickedImageName('gallery', 2, 'image/png', now), 'gallery-20261104T090506-3.png');
});
