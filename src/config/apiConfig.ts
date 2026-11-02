/**
 * Runtime configuration for the importer.
 *
 * Only publishable values live here: the Supabase anon key is a public client
 * key, and every privileged operation goes through porokh-backend. No Gemini or
 * service-role secret is ever read by this app.
 */

const readEnv = (value: string | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

export const SUPABASE_URL = readEnv(import.meta.env.VITE_SUPABASE_URL).replace(/\/+$/, '');
export const SUPABASE_ANON_KEY = readEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

const configuredApiUrl = readEnv(import.meta.env.VITE_API_URL).replace(/\/+$/, '');

export const API_BASE_URL = configuredApiUrl
  ? configuredApiUrl.endsWith('/api/v1')
    ? configuredApiUrl
    : `${configuredApiUrl}/api/v1`
  : 'http://127.0.0.1:5000/api/v1';

export const isAuthConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
