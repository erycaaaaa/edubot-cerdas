"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = void 0;
exports.getSupabaseCredentials = getSupabaseCredentials;
exports.getSupabaseAdmin = getSupabaseAdmin;
exports.createLoginClient = createLoginClient;
const supabase_js_1 = require("@supabase/supabase-js");
// ============================================================
// 1. ENVIRONMENT VALIDATION
// ============================================================
function getRequiredEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing ${name} in environment variables`);
    }
    return value;
}
// ============================================================
// 2. SUPABASE URL
// ============================================================
function getSupabaseUrl() {
    const url = getRequiredEnv('SUPABASE_URL');
    if (!/^https?:\/\//i.test(url)) {
        throw new Error('SUPABASE_URL must begin with http:// or https://');
    }
    return url.replace(/\/+$/, '');
}
// ============================================================
// 3. SUPABASE ADMIN CREDENTIALS
// ============================================================
function getSupabaseCredentials() {
    const supabaseUrl = getSupabaseUrl();
    // Support modern secret keys and legacy service role keys.
    const serviceKey = process.env.SUPABASE_SECRET_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_KEY?.trim();
    if (!serviceKey) {
        throw new Error('Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY');
    }
    return {
        supabaseUrl,
        serviceKey,
    };
}
// ============================================================
// 4. SUPABASE PUBLISHABLE KEY
// ============================================================
function getPublishableKey() {
    const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
        process.env.VITE_SUPABASE_ANON_KEY?.trim();
    if (!key) {
        throw new Error('Missing Supabase publishable key');
    }
    return key;
}
// ============================================================
// 5. AUTH OPTIONS
// ============================================================
const authOptions = {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
    },
};
// ============================================================
// 6. ADMIN CLIENT
// ============================================================
let adminClient = null;
function getSupabaseAdmin() {
    if (!adminClient) {
        const { supabaseUrl, serviceKey, } = getSupabaseCredentials();
        adminClient = (0, supabase_js_1.createClient)(supabaseUrl, serviceKey, authOptions);
        console.log('[SUPABASE] Admin client initialized');
    }
    return adminClient;
}
// ============================================================
// 7. LAZY ADMIN CLIENT EXPORT
// ============================================================
exports.supabaseAdmin = new Proxy({}, {
    get(_target, prop) {
        const client = getSupabaseAdmin();
        const value = Reflect.get(client, prop, client);
        return typeof value === 'function'
            ? value.bind(client)
            : value;
    },
});
// ============================================================
// 8. LOGIN CLIENT
// ============================================================
function createLoginClient() {
    const supabaseUrl = getSupabaseUrl();
    const publishableKey = getPublishableKey();
    return (0, supabase_js_1.createClient)(supabaseUrl, publishableKey, authOptions);
}
// ============================================================
// 9. SAFE CONFIGURATION DIAGNOSTICS
// ============================================================
// Admin configuration.
try {
    const { supabaseUrl, serviceKey, } = getSupabaseCredentials();
    getSupabaseAdmin();
    console.log('[SUPABASE CONFIG]', {
        projectConfigured: Boolean(supabaseUrl),
        adminKeyConfigured: Boolean(serviceKey),
        adminKeyType: serviceKey.startsWith('sb_secret_')
            ? 'secret'
            : 'legacy-or-other',
    });
}
catch (error) {
    console.error('[SUPABASE] Admin initialization failed:', error instanceof Error
        ? error.message
        : String(error));
}
// Login configuration.
try {
    const publishableKey = getPublishableKey();
    console.log('[SUPABASE CONFIG]', {
        loginKeyConfigured: Boolean(publishableKey),
        loginKeyType: publishableKey.startsWith('sb_publishable_')
            ? 'publishable'
            : 'legacy-anon',
    });
}
catch (error) {
    console.error('[SUPABASE] Login configuration failed:', error instanceof Error
        ? error.message
        : String(error));
}
