import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStoredSession, sessionNeedsRefresh } from './session.ts';
import type { ImporterSession } from '../types/auth.ts';

const valid: ImporterSession = {
  access_token: 'access',
  refresh_token: 'refresh',
  expires_at: 2_000_000_000,
  user: { id: 'user-1', email: 'editor@example.com' },
};

test('returns null for missing, malformed or incomplete sessions', () => {
  assert.equal(parseStoredSession(null), null);
  assert.equal(parseStoredSession(''), null);
  assert.equal(parseStoredSession('not json'), null);
  assert.equal(parseStoredSession('null'), null);
  assert.equal(parseStoredSession(JSON.stringify({ ...valid, access_token: '' })), null);
  assert.equal(parseStoredSession(JSON.stringify({ ...valid, refresh_token: undefined })), null);
  assert.equal(parseStoredSession(JSON.stringify({ ...valid, user: { email: 'x' } })), null);
});

test('restores a complete session and normalises optional fields', () => {
  const parsed = parseStoredSession(JSON.stringify(valid));
  assert.deepEqual(parsed, valid);

  const withoutEmail = parseStoredSession(
    JSON.stringify({ ...valid, expires_at: 'soon', user: { id: 'user-1' } })
  );
  assert.equal(withoutEmail?.expires_at, 0);
  assert.equal(withoutEmail?.user.email, '');
});

test('refreshes only inside the safety window', () => {
  const session = { ...valid, expires_at: 1_000 };
  assert.equal(sessionNeedsRefresh(session, 900), false);
  assert.equal(sessionNeedsRefresh(session, 940), true);
  assert.equal(sessionNeedsRefresh(session, 950, 10), false);
});
