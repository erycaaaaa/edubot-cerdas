const assert = require('node:assert/strict');
const http = require('node:http');
const { before, after, test } = require('node:test');

// Real Supabase SDK against a local stub: no live accounts or database writes.
const token = (role, sub) => [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({ role, sub, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'),
  'test-signature',
].join('.');
const serviceKey = token('service_role', 'test-service');
const progress = new Map();
const events = new Set();
const writes = [];
let server, loginUser, processConversationReward, supabaseAdmin;

before(async () => {
  server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    const url = new URL(req.url, 'http://localhost');
    const send = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    if (url.pathname === '/auth/v1/token') {
      if (body.password === 'invalid') return send(400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      const id = body.email.split('@')[0];
      return send(200, {
        access_token: token('authenticated', id), refresh_token: 'test-refresh-' + id,
        token_type: 'bearer', expires_in: 3600,
        user: { id, email: body.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
      });
    }
    if (url.pathname === '/rest/v1/profiles') {
      const id = url.searchParams.get('id').slice(3);
      const profile = { id, email: id + '@example.test', name: id, role: 'student', school_id: 'example.test', grade: 5, avatar: '🦁', is_blocked: false, strike_count: 0 };
      return send(200, req.headers.accept?.includes('application/vnd.pgrst.object+json') ? profile : [profile]);
    }
    if (url.pathname === '/rest/v1/student_gamification' && req.method === 'GET') {
      const id = url.searchParams.get('student_id').slice(3);
      return send(200, progress.has(id) ? [progress.get(id)] : []);
    }
    if (url.pathname === '/rest/v1/rpc/credit_learning_reward') {
      writes.push({ path: url.pathname, authorization: req.headers.authorization });
      if (req.headers.authorization !== 'Bearer ' + serviceKey) {
        return send(403, { code: '42501', message: 'new row violates row-level security policy for table "student_gamification"' });
      }
      // This stub verifies SDK authorization and response handling, not SQL atomicity.
      const row = progress.get(body.p_user_id) ?? { student_id: body.p_user_id, xp: 0, level: 1, exp_spent: 0 };
      const event = JSON.stringify([body.p_user_id, body.p_request_id, body.p_event]);
      const delta = events.has(event) ? 0 : body.p_delta;
      row.xp += delta;
      row.level = row.xp >= 100 ? 2 : 1;
      progress.set(body.p_user_id, row);
      events.add(event);
      return send(200, { xp: row.xp, level: row.level, expBalance: row.xp - row.exp_spent, rewardDelta: delta });
    }
    if (url.pathname === '/reward/evaluate') {
      assert.equal(req.headers.authorization, 'Bearer test-reward-key');
      const delta = body.moderation_label === 'TOXIC' ? 0 : 1;
      const xp = body.current_xp + delta;
      return send(200, { reward_delta: delta, new_xp: xp, level: { level: xp >= 100 ? 2 : 1, name: 'Test level', current_xp: xp, next_level_xp: 100, progress_to_next_level: xp / 100 }, reason: 'test', safety_gate: delta ? 'PASS' : 'BLOCK_REWARD', request_id: body.request_id });
    }
    return send(404, { message: 'Unexpected test request' });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  process.env.SUPABASE_URL = base;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
  process.env.GAMIFICATION_API_URL = base;
  process.env.GAMIFICATION_API_KEY = 'test-reward-key';
  ({ loginUser } = require('../src/controllers/authController'));
  ({ processConversationReward } = require('../src/services/gamificationService'));
  ({ supabaseAdmin } = require('../src/services/supabaseService'));
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
});

async function login(id, password = 'test-password') {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await loginUser({ body: { email: id + '@example.test', password } }, res);
  return res;
}

test('login keeps reward RPCs privileged: ten eligible chats persist 10 XP', async () => {
  const response = await login('student-one');
  assert.equal(response.statusCode, 200);
  const claims = JSON.parse(Buffer.from(response.body.session.access_token.split('.')[1], 'base64url').toString());
  assert.equal(claims.sub, 'student-one');
  assert.equal(claims.role, 'authenticated');
  for (let i = 1; i <= 10; i++) {
    const reward = await processConversationReward({ studentId: 'student-one', requestId: 'safe-' + i, moderationLabel: 'NON_TOXIC' });
    assert.equal(reward.new_xp, i);
  }
  assert.equal(progress.get('student-one').xp, 10);
  assert.equal(progress.get('student-one').level, 1);
  const replay = await processConversationReward({ studentId: 'student-one', requestId: 'safe-1', moderationLabel: 'NON_TOXIC' });
  assert.equal(replay.reward_delta, 0);
  assert.equal(replay.new_xp, 10);
  assert.equal((await supabaseAdmin.auth.getSession()).data.session, null);
});

test('concurrent user logins and invalid credentials leave reward writes privileged', async () => {
  const responses = await Promise.all([login('student-two'), login('student-three'), login('invalid-user', 'invalid')]);
  assert.deepEqual(responses.map(r => r.statusCode), [200, 200, 401]);
  assert.equal(responses[0].body.user.id, 'student-two');
  assert.equal(responses[1].body.user.id, 'student-three');
  const rewards = await Promise.all(['student-two', 'student-three'].map(studentId => processConversationReward({ studentId, requestId: studentId + '-safe', moderationLabel: 'NON_TOXIC' })));
  assert.deepEqual(rewards.map(r => r.new_xp), [1, 1]);
  const toxic = await processConversationReward({ studentId: 'student-two', requestId: 'toxic', moderationLabel: 'TOXIC' });
  assert.equal(toxic.reward_delta, 0);
  assert.equal(progress.get('student-two').xp, 1);
  assert.ok(writes.length > 0);
  assert.ok(writes.every(w => w.authorization === 'Bearer ' + serviceKey));
  assert.equal((await supabaseAdmin.auth.getSession()).data.session, null);
});
