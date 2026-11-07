const assert = require('node:assert/strict');
const { test, describe, before, after } = require('node:test');
const http = require('node:http');

describe('Vercel Serverless Function Invocation Tests', () => {
  let app;
  let server;
  let port;

  before(async () => {
    // Simulate Vercel runtime environment
    process.env.VERCEL = '1';

    // Import root entrypoint (server.js and index.js shim)
    const serverModule = require('../server.js');
    app = serverModule.default || serverModule;

    // Verify app is a callable express application / request handler
    assert.equal(typeof app, 'function', 'App export must be a function/request handler');

    // Also verify index.js compatibility shim
    const indexModule = require('../index.js');
    const indexApp = indexModule.default || indexModule;
    assert.equal(typeof indexApp, 'function', 'Index shim export must be a function/request handler');

    // Also verify dist/server.js directly
    const distModule = require('../dist/server.js');
    const distApp = distModule.default || distModule;
    assert.equal(typeof distApp, 'function', 'Dist export must be a function/request handler');

    // Spin up a test server to execute HTTP calls against the app
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('GET /health succeeds with 200 OK in serverless mode', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
  });

  test('GET /api/health succeeds with 200 OK and returns running status', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'OK');
    assert.equal(body.architecture, 'REST + Supabase');
  });

  test('POST /api/auth/login without body returns 400 JSON and does not crash', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.message.includes('Email dan password harus diisi'));
  });

  test('POST /api/auth/login with missing Supabase env gracefully returns 500 JSON without process crash', async () => {
    // Ensure both role key and legacy key are unset
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_KEY;

    const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    // Must return JSON with 500, not unhandled FUNCTION_INVOCATION_FAILED crash
    assert.equal(res.status, 500);
    assert.equal(res.headers.get('content-type')?.includes('application/json'), true);
    const body = await res.json();
    assert.equal(body.message, 'Terjadi kesalahan pada server.');
  });

  test('POST /api/auth/login with SUPABASE_SERVICE_KEY fallback attempts auth and returns 401 for wrong credentials', async () => {
    // Provide credentials using legacy SUPABASE_SERVICE_KEY name
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_URL = 'https://dxfikfopmexufwapeguw.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'sb_secret_xwie7gttlKJnlp-rREJySQ_VmxZiIup';

    const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent_test_user@invalid.com',
        password: 'wrong_password_123',
      }),
    });

    // Should recognize the key, reach Supabase and return 401 (invalid credentials), NOT 500
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.ok(body.message.includes('Email atau password salah'));
  });
});
