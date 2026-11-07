import { createClient, SupabaseClient } from '@supabase/supabase-js';

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {
  // In serverless / production environments (such as Vercel), environment variables
  // are provided directly by the platform runtime and dotenv is optional.
}

// ENV & VALIDATION HELPERS

export function getSupabaseCredentials(): { supabaseUrl: string; serviceKey: string } {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY
  )?.trim();

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL in environment');
  }

  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) in environment');
  }

  if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    throw new Error('SUPABASE_URL must begin with http:// or https://');
  }

  return { supabaseUrl, serviceKey };
}

// SUPABASE ADMIN CLIENT (LAZY INITIALIZATION)

let _adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    const { supabaseUrl, serviceKey } = getSupabaseCredentials();
    _adminClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    console.log('✅ Supabase Admin client initialized');
  }
  return _adminClient;
}

/**
 * Proxied Supabase Admin client.
 *
 * Defers credential validation until first access.
 * This prevents unhandled top-level crashes during serverless module evaluation
 * (avoiding Vercel FUNCTION_INVOCATION_FAILED) while preserving the exact same API.
 */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

/** Isolate password-login sessions from the shared privileged DB client. */
export function createLoginClient(): SupabaseClient {
  const { supabaseUrl, serviceKey } = getSupabaseCredentials();
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// Non-crashing startup check for logs/diagnostics
try {
  getSupabaseAdmin();
} catch (error) {
  console.warn(
    '⚠️ [Startup] Supabase credentials not ready during module load:',
    error instanceof Error ? error.message : String(error)
  );
}
