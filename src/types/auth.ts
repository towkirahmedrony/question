/** Session shapes shared by the auth service, API client and storage adapters. */

export interface ImporterSession {
  access_token: string;
  refresh_token: string;
  /** Seconds since the epoch, as Supabase reports it. */
  expires_at: number;
  user: { id: string; email: string };
}

export interface ImporterIdentity {
  role: string;
  permissions: string[];
}
