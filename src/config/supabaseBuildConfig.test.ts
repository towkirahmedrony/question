import assert from 'node:assert/strict';
import test from 'node:test';
import { requireSupabaseBuildConfig } from './supabaseBuildConfig.ts';

const validEnvironment = {
  VITE_SUPABASE_URL: 'https://project-id.supabase.co/',
  VITE_SUPABASE_ANON_KEY: 'sb_publishable_test_fixture',
};

test('requires both Supabase values for a production build', () => {
  assert.throws(
    () => requireSupabaseBuildConfig({}),
    /VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY/
  );
  assert.throws(
    () => requireSupabaseBuildConfig({ VITE_SUPABASE_URL: validEnvironment.VITE_SUPABASE_URL }),
    /VITE_SUPABASE_ANON_KEY/
  );
});

test('normalizes the URL and accepts a public publishable key', () => {
  assert.deepEqual(requireSupabaseBuildConfig(validEnvironment), {
    url: 'https://project-id.supabase.co',
    anonKey: validEnvironment.VITE_SUPABASE_ANON_KEY,
  });
});

test('requires an absolute HTTP(S) Supabase URL', () => {
  assert.throws(
    () => requireSupabaseBuildConfig({ ...validEnvironment, VITE_SUPABASE_URL: 'not-a-url' }),
    /absolute HTTP\(S\) URL/
  );
});

test('rejects a privileged JWT role and Supabase secret-key prefix', () => {
  const payload = btoa(JSON.stringify({ role: 'service_role' }));
  assert.throws(
    () => requireSupabaseBuildConfig({ ...validEnvironment, VITE_SUPABASE_ANON_KEY: `header.${payload}.signature` }),
    /public anon\/publishable key/
  );
  assert.throws(
    () => requireSupabaseBuildConfig({ ...validEnvironment, VITE_SUPABASE_ANON_KEY: 'sb_secret_test_fixture' }),
    /public anon\/publishable key/
  );
});
