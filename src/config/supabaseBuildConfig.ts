export type SupabaseBuildEnvironment = Record<string, string | undefined>;

export type SupabaseBuildConfig = {
  url: string;
  anonKey: string;
};

/**
 * Validate the public Supabase configuration used by a production web build.
 * This deliberately returns only validated publishable configuration and
 * never includes values in an error message.
 */
export const requireSupabaseBuildConfig = (
  environment: SupabaseBuildEnvironment
): SupabaseBuildConfig => {
  const url = environment.VITE_SUPABASE_URL?.trim() ?? '';
  const anonKey = environment.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
  const missing = [
    !url && 'VITE_SUPABASE_URL',
    !anonKey && 'VITE_SUPABASE_ANON_KEY',
  ].filter((name): name is string => Boolean(name));

  if (missing.length > 0) {
    throw new Error(
      `Production build requires ${missing.join(' and ')}. Configure the Supabase project URL and public anon/publishable key; no fallback configuration is used.`
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('VITE_SUPABASE_URL must be an absolute HTTP(S) URL.');
  }
  if ((parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') || !parsedUrl.hostname) {
    throw new Error('VITE_SUPABASE_URL must be an absolute HTTP(S) URL.');
  }

  if (/^sb_secret_/i.test(anonKey) || hasPrivilegedJwtRole(anonKey)) {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY must be a public anon/publishable key, not a service-role or secret key.'
    );
  }

  return { url: url.replace(/\/+$/, ''), anonKey };
};

const hasPrivilegedJwtRole = (value: string): boolean => {
  const parts = value.split('.');
  if (parts.length !== 3) return false;

  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='));
    const role: unknown = (JSON.parse(decoded) as { role?: unknown }).role;
    return typeof role === 'string' && role !== 'anon';
  } catch {
    return false;
  }
};
