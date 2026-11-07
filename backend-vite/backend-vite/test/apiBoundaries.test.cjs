const assert = require('node:assert/strict');
const http = require('node:http');
const { before, after, test } = require('node:test');

// Real Express routes and Supabase SDK, isolated HTTP fixture; no live credentials.
let fixture, server, base;
const calls = [];
const awards = new Set();
const users = {
  admin: { id: 'admin-one', role: 'admin' },
  student: { id: 'student-one', role: 'student' },
  other: { id: 'student-two', role: 'student' },
  teacher: { id: 'teacher-one', role: 'teacher' },
  parent: { id: 'parent-one', role: 'parent' },
  blocked: { id: 'blocked-one', role: 'student', is_blocked: true },
};
before(async () => {
  fixture = http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    const url = new URL(req.url, 'http://fixture');
    calls.push({ path: url.pathname, query: url.searchParams, body, method: req.method });
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
    if (url.pathname === '/auth/v1/user') {
      const user = users[req.headers.authorization?.replace('Bearer ', '')];
      return user ? send(200, { ...user, email: `${user.id}@school.test`, aud: 'authenticated' }) : send(401, { message: 'Invalid token' });
    }
    if (url.pathname === '/rest/v1/profiles') {
      assert.ok(!url.searchParams.get('select')?.includes('full_name'), 'Only migrated profile columns may be selected');
      const id = url.searchParams.get('id')?.slice(3);
      if (url.searchParams.get('school_id') === 'eq.school.test' && url.searchParams.get('role') === 'eq.student') {
        return send(200, [
          { id: 'student-one', name: 'student-one', email: 'student-one@school.test', role: 'student', school_id: 'school.test', avatar: '🦁', strike_count: 0, is_blocked: false },
          { id: 'student-two', name: 'student-two', email: 'student-two@school.test', role: 'student', school_id: 'school.test', avatar: '🦁', strike_count: 1, is_blocked: false },
        ]);
      }
      if (!id) return send(200, []);
      const user = Object.values(users).find(value => value.id === id);
      return send(200, { ...user, email: `${id}@school.test`, name: id, school_id: 'school.test', avatar: '🦁', strike_count: 0, is_blocked: user?.is_blocked ?? false });
    }
    if (url.pathname === '/rest/v1/schools') return send(200, [{ id: 'school.test', is_active: true }]);
    if (url.pathname === '/rest/v1/classes') {
      if (url.searchParams.get('teacher_id') === 'eq.teacher-one') {
        return send(200, [{ id: 'class-one', name: '1A', grade: 1, teacher_id: 'teacher-one', school_id: 'school.test' }]);
      }
      return send(200, []);
    }
    if (url.pathname === '/rest/v1/class_students') {
      const classId = url.searchParams.get('class_id');
      if (classId && classId.includes('class-one')) {
        return send(200, [{ student_id: 'student-one' }, { student_id: 'student-two' }]);
      }
      return send(200, []);
    }
    if (url.pathname === '/rest/v1/student_gamification') return send(200, [{ student_id: 'student-one', xp: 1, level: 1, exp_spent: 0 }]);
    if (url.pathname === '/rest/v1/gamification_events') {
      assert.equal(url.searchParams.get('event_type'), 'eq.conversation_completed');
      assert.equal(url.searchParams.get('moderation_label'), 'eq.NON_TOXIC');
      assert.equal(url.searchParams.get('reward_delta'), 'gt.0');
      const eligible = url.searchParams.get('student_id') === 'eq.student-one' && url.searchParams.get('request_id') === 'eq.safe-chat';
      return send(200, eligible ? [{ id: 'event-one' }] : []);
    }
    if (url.pathname === '/reward/evaluate') return send(200, { reward_delta: body.moderation_label === 'TOXIC' ? 0 : body.event === 'conversation_completed' ? 1 : body.feedback === 'helpful' ? 2 : 0, new_xp: 3, level: { level: 1 }, reason: 'rewarded_event', safety_gate: 'PASS' });
    if (url.pathname === '/moderate') {
      if (body.text === 'moderation-down') return send(503, { message: 'Unavailable' });
      const toxic = body.text === 'toxic question' || body.text === 'generated:unsafe-output';
      return send(200, { label: toxic ? 'TOXIC' : 'NON_TOXIC', probability_toxic: toxic ? 0.99 : 0.01, threshold: 0.5, n_chunks: 1, action: toxic ? 'REJECT' : 'CONTINUE', detected_words: [] });
    }
    if (url.pathname === '/generate') return body.prompt === 'generator-down' ? send(503, { message: 'Unavailable' }) : send(200, { response: `generated:${body.prompt}` });
    if (url.pathname === '/rest/v1/rpc/record_student_strike') return send(200, { strikeLevel: 1, strikeCount: 1, isBlocked: false, notificationId: 'notice-one' });
    if (url.pathname === '/rest/v1/rpc/reset_student_strikes') return body.p_student_id === 'foreign-id' ? send(400, { code: 'P0001', message: 'STUDENT_NOT_FOUND' }) : send(200, null);
    if (url.pathname === '/rest/v1/rpc/credit_learning_reward') {
      const key = JSON.stringify([body.p_user_id, body.p_request_id, body.p_event]);
      const delta = awards.has(key) ? 0 : body.p_delta;
      awards.add(key);
      return send(200, { xp: 3, expBalance: 3, rewardDelta: delta });
    }
    if (url.pathname === '/rest/v1/rpc/unlock_avatar') return send(400, { message: 'INSUFFICIENT_EXP', code: 'P0001' });
    if (url.pathname === '/rest/v1/rpc/equip_avatar') return send(400, { message: 'AVATAR_NOT_OWNED', code: 'P0001' });
    if (url.pathname === '/rest/v1/teacher_notifications') {
      if (url.searchParams.get('school_id') === 'eq.school.test' && url.searchParams.get('student_id')?.includes('student-one')) {
        return send(200, [{ id: 'notice-one', student_id: 'student-one', school_id: 'school.test', title: 'Reminder', description: 'Test', is_read: false }]);
      }
      return send(200, []);
    }
    if (url.pathname === '/rest/v1/teacher_notifications/foreign-id') {
      return send(200, { id: 'foreign-id', student_id: 'student-two', school_id: 'school.test' });
    }
    return send(404, { message: 'Unexpected fixture request' });
  });
  await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
  process.env.SUPABASE_URL = `http://127.0.0.1:${fixture.address().port}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-service-key';
  process.env.GAMIFICATION_API_URL = process.env.SUPABASE_URL;
  process.env.MODERATION_API_URL = process.env.SUPABASE_URL;
  process.env.GENERATOR_API_URL = process.env.SUPABASE_URL;
  process.env.CORS_ORIGINS = 'http://localhost:5175';
  const app = require('../src/server').default;
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (fixture) await new Promise(resolve => fixture.close(resolve));
});
async function request(path, user, body, method = body === undefined ? 'GET' : 'POST') {
  const response = await fetch(base + path, { method,
    headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${user}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json() };
}

test('health, CORS, malformed JSON and unknown routes keep explicit HTTP contracts', async () => {
  assert.equal((await request('/health')).status, 200);
  assert.equal((await request('/missing')).status, 404);
  const allowed = await fetch(base + '/health', { headers: { Origin: 'http://localhost:5175' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5175');
  const denied = await fetch(base + '/health', { headers: { Origin: 'https://untrusted.test' } });
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), { error: 'Origin not allowed' });
  const malformed = await fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: 'Invalid JSON body' });
});

test('missing, invalid and blocked sessions are denied; roles cannot cross boundaries', async () => {
  assert.equal((await request('/api/auth/me')).status, 401);
  assert.equal((await request('/api/auth/me', 'invalid')).status, 401);
  assert.equal((await request('/api/auth/me', 'blocked')).status, 403);
  assert.equal((await request('/api/auth/me', 'student')).data.user.role, 'student');
  for (const user of ['teacher', 'parent']) {
    assert.equal((await request('/api/me/gamification', user)).status, 403);
    assert.equal((await request('/api/chat', user, { message: 'Hello' })).status, 403);
  }
  assert.equal((await request('/api/teacher/students', 'student')).status, 403);
});

test('public registration cannot self-approve teacher privileges or invalid roles', async () => {
  const before = calls.length;
  const details = { email: 'teacher@school.test', name: 'Teacher', password: 'test-password' };
  assert.equal((await request('/api/auth/register', null, { ...details, role: 'teacher' })).status, 403);
  assert.equal((await request('/api/auth/register', null, { ...details, role: 'admin' })).status, 400);
  assert.equal((await request('/api/auth/register', null, { ...details, role: 'student', grade: 2.5 })).status, 400);
  assert.equal(calls.length, before);
});

test('feedback rejects absent/arbitrary/foreign IDs before calculator or credit calls', async () => {
  const before = calls.filter(call => call.path === '/reward/evaluate').length;
  for (const requestId of [undefined, '', 'x'.repeat(201)]) {
    assert.equal((await request('/api/me/gamification/feedback', 'student', { feedback: 'helpful', requestId })).status, 400);
  }
  assert.equal((await request('/api/me/gamification/feedback', 'student', { feedback: 'helpful', requestId: 'invented' })).status, 409);
  assert.equal((await request('/api/me/gamification/feedback', 'other', { feedback: 'helpful', requestId: 'safe-chat' })).status, 409);
  assert.equal(calls.filter(call => call.path === '/reward/evaluate').length, before);
});

test('eligible feedback uses authenticated identity and database-authoritative replay result', async () => {
  const body = { feedback: 'helpful', requestId: 'safe-chat', studentId: 'spoofed' };
  const first = await request('/api/me/gamification/feedback', 'student', body);
  assert.equal(first.status, 200); assert.equal(first.data.data.reward_delta, 2);
  const replay = await request('/api/me/gamification/feedback', 'student', body);
  assert.equal(replay.data.data.reward_delta, 0);
  assert.equal(replay.data.data.new_xp, 3);
  const credit = calls.filter(call => call.path.endsWith('/credit_learning_reward')).at(-1);
  assert.equal(credit.body.p_user_id, 'student-one');
});

test('avatar mutations reject client balances and preserve business error statuses', async () => {
  const before = calls.filter(call => call.path.includes('/rpc/')).length;
  assert.equal((await request('/api/me/avatars/dragon/unlock', 'student', { cost_exp: 0 })).status, 400);
  assert.equal((await request('/api/me/avatars/INVALID/unlock', 'student', {})).status, 400);
  assert.equal(calls.filter(call => call.path.includes('/rpc/')).length, before);
  assert.equal((await request('/api/me/avatars/dragon/unlock', 'student', {})).status, 409);
  assert.equal((await request('/api/me/avatars/dragon/equip', 'student', {})).status, 403);
  assert.equal(calls.at(-1).body.p_user_id, 'student-one');
});

test('teacher lists and notification writes are scoped to the verified school', async () => {
  assert.equal((await request('/api/teacher/students', 'teacher')).status, 200);
  assert.equal(calls.at(-1).query.get('school_id'), 'eq.school.test');
  assert.equal(calls.at(-1).query.get('role'), 'eq.student');
  assert.equal((await request('/api/teacher/notifications', 'teacher')).status, 200);
  assert.equal(calls.at(-1).query.get('school_id'), 'eq.school.test');
  await request('/api/teacher/notifications/foreign-id/read', 'teacher', {}, 'PATCH');
  assert.equal(calls.at(-1).query.get('school_id'), 'eq.school.test');
});

test('chat pipeline separates safe answers, toxic input, unsafe output and outages', async () => {
  const strikes = () => calls.filter(call => call.path.endsWith('/record_student_strike')).length;
  const initial = strikes();
  const safe = await request('/api/chat', 'student', { message: 'safe question', requestId: 'safe-pipeline' });
  assert.equal(safe.data.data.status, 'OK');
  assert.equal(safe.data.data.gamification.rewardDelta, 1);
  const generators = calls.filter(call => call.path === '/generate').length;
  const outage = await request('/api/chat', 'student', { message: 'moderation-down', requestId: 'outage' });
  assert.equal(outage.data.data.status, 'MODERATION_NOT_AVAILABLE');
  assert.equal(outage.data.data.hasViolation, false);
  assert.equal(calls.filter(call => call.path === '/generate').length, generators);
  const output = await request('/api/chat', 'student', { message: 'unsafe-output', requestId: 'unsafe-answer' });
  assert.equal(output.data.data.status, 'REJECTED_OUTPUT_UNSAFE');
  assert.equal(output.data.data.hasViolation, false);
  const unavailable = await request('/api/chat', 'student', { message: 'generator-down', requestId: 'generator-outage' });
  assert.equal(unavailable.data.data.status, 'GENERATOR_NOT_AVAILABLE');
  assert.equal(strikes(), initial);
  const toxic = await request('/api/chat', 'student', { message: 'toxic question', requestId: 'toxic-pipeline' });
  assert.equal(toxic.data.data.status, 'REJECTED_INPUT_UNSAFE');
  assert.equal(toxic.data.data.strikeCount, 1);
  assert.equal(toxic.data.data.gamification.rewardDelta, 0);
  assert.equal(strikes(), initial + 1);
});

test('foreign-school reset is a not-found response and reset identity is server-owned', async () => {
  assert.equal((await request('/api/teacher/students/foreign-id/reset-strikes', 'teacher', { notes: 'reviewed' })).status, 404);
  assert.equal((await request('/api/teacher/students/student-one/reset-strikes', 'teacher', { notes: 'reviewed', teacherId: 'spoofed' })).status, 200);
  assert.equal(calls.at(-1).body.p_teacher_id, 'teacher-one');
  assert.equal(calls.at(-1).body.p_school_id, 'school.test');
});
