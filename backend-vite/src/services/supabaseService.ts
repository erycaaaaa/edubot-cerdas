import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// ============================================================
// ENV
// ============================================================

const supabaseUrl =
  process.env.SUPABASE_URL?.trim();

const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

// ============================================================
// VALIDATION
// ============================================================

if (!supabaseUrl) {
  throw new Error(
    'Missing SUPABASE_URL in environment'
  );
}

if (!serviceKey) {
  throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY in environment'
  );
}

// ============================================================
// SUPABASE ADMIN CLIENT
// ============================================================

/**
 * Backend-only Supabase client.
 *
 * IMPORTANT:
 * - Service role key hanya boleh berada di backend.
 * - Jangan masukkan service role key ke frontend.
 * - Jangan expose key ini melalui API response.
 * - Never sign users in on this shared client: even with persistSession
 *   disabled, an in-memory user session replaces the database bearer token.
 */
export const supabaseAdmin =
  createClient(
    supabaseUrl,
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

/** Isolate password-login sessions from the shared privileged DB client. */
export function createLoginClient() {
  return createClient(supabaseUrl!, serviceKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

console.log(
  '✅ Supabase Admin client initialized'
);
