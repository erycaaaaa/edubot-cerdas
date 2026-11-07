const assert = require('node:assert/strict');
const http = require('node:http');
const { before, after, test } = require('node:test');
let fixture, server, base;
const calls = [];
const teacherId = '00000000-0000-4000-8000-000000000003';
let blocked = false, schoolActive = true, invitationStatus = 'sent';
const roles = { admin: 'admin', student: 'student', teacher: 'teacher', parent: 'parent', blockedadmin: 'admin' };
before(async () => {
  fixture = http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    const url = new URL(req.url, 'http://fixture');
    calls.push({ path: url.pathname, body, query: url.searchParams, headers: req.headers });
    const send = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
    if (url.pathname === '/auth/v1/user') {
      const token = req.headers.authorization?.replace('Bearer ', '');
      return roles[token] ? send(200, { id: token === 'teacher' ? teacherId : token, email: token + '@test.invalid' }) : send(401, { message: 'Invalid token' });
    }
    if (url.pathname === '/rest/v1/profiles') {
      const id = url.searchParams.get('id')?.slice(3);
      const identity = id === teacherId ? 'teacher' : id;
      return send(200, id ? { id, role: roles[identity], school_id: 'school-a', name: id, email: id + '@test.invalid', is_blocked: id === 'blockedadmin' || (identity === 'teacher' && blocked) } : [{ id: teacherId, role: 'teacher', school_id: 'school-a' }]);
    }
    if (url.pathname === '/rest/v1/schools') return send(200, [{ id: 'school-a', name: 'School A', code: 'A', is_active: schoolActive }]);
    if (url.pathname === '/rest/v1/teacher_invitations') return send(200, [{ id: 'invitation-one', user_id: 'teacher', status: invitationStatus }]);
    if (url.pathname === '/rest/v1/rpc/admin_manage') {
      assert.equal(req.headers.authorization, 'Bearer fixture-service-key');
      assert.equal(body.p_actor, 'admin');
      if (body.p_target === 'missing') return send(400, { message: 'SCHOOL_NOT_FOUND', code: 'P0001' });
      if (body.p_data.code === 'DUPLICATE' || body.p_data.email === 'duplicate@test.invalid') return send(400, { message: 'duplicate', code: '23505' });
      if (body.p_data.school_id === 'inactive') return send(400, { message: 'SCHOOL_UNAVAILABLE', code: 'P0001' });
      if (body.p_data.code === 'DBFAIL') return send(500, { message: 'secret database details' });
      if (body.p_action === 'teacher_status') blocked = body.p_data.is_blocked;
      return send(200, { id: 'invitation-one', ...body.p_data });
    }
    if (url.pathname === '/auth/v1/invite') {
      assert.equal(req.headers.authorization, 'Bearer fixture-service-key');
      if (body.email === 'fail@test.invalid') return send(500, { message: 'sensitive provider failure' });
      return send(200, { id: teacherId, email: body.email });
    }
    if (url.pathname === '/auth/v1/admin/users/' + teacherId) return send(200, { id: 'teacher' });
    if (url.pathname === '/rest/v1/rpc/accept_teacher_invitation') { invitationStatus = 'accepted'; return send(200, null); }
    return send(404, { message: 'Unexpected fixture path' });
  });
  await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
  process.env.SUPABASE_URL = `http://127.0.0.1:${fixture.address().port}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-service-key';
  process.env.APP_URL = 'https://edubuz.test';
  server = require('../src/server').default.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(r => server.close(r)); await new Promise(r => fixture.close(r)); });
async function request(path, token, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body && method !== 'GET' ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}
test('every admin route rejects missing login and non-admin roles before privileged calls', async () => {
  const endpoints = [['GET','/schools'], ['POST','/schools'], ['PATCH','/schools/a'], ['GET','/teachers'], ['POST','/teachers/invite'], ['PATCH',`/teachers/${teacherId}/school`], ['PATCH',`/teachers/${teacherId}/status`]];
  for (const [method, path] of endpoints) {
    assert.equal((await request('/api/admin' + path, null, method, {})).status, 401);
    for (const role of ['student', 'teacher', 'parent', 'blockedadmin']) assert.equal((await request('/api/admin' + path, role, method, {})).status, 403);
  }
  assert.equal(calls.filter(c => c.path.includes('/rpc/') || c.path === '/auth/v1/invite').length, 0);
  assert.equal((await request('/api/auth/me', 'admin')).data.user.role, 'admin');
  assert.equal((await request('/api/auth/register', null, 'POST', { name: 'Student', email: 'student@test.invalid', password: 'test-password', role: 'student', schoolId: 'school-a' })).status, 400);
});
test('school list/count, creation, edit and deactivation use server actor and validated fields', async () => {
  const schools = await request('/api/admin/schools', 'admin');
  assert.equal(schools.status, 200); assert.equal(schools.data.data[0].teacher_count, 1);
  assert.equal((await request('/api/admin/schools', 'admin', 'POST', { name: 'New school', code: 'abc' })).status, 201);
  assert.equal((await request('/api/admin/schools/school-a', 'admin', 'PATCH', { name: 'Renamed', is_active: false })).status, 200);
  assert.equal((await request('/api/admin/schools', 'admin', 'POST', { name: 'School', code: 'A', actor: 'other' })).status, 400);
  assert.equal((await request('/api/admin/schools', 'admin', 'POST', { name: 'School', code: 'DUPLICATE' })).status, 409);
  assert.equal((await request('/api/admin/schools/missing', 'admin', 'PATCH', { is_active: false })).status, 404);
  const failure = await request('/api/admin/schools', 'admin', 'POST', { name: 'School', code: 'DBFAIL' });
  assert.equal(failure.status, 503); assert.ok(!JSON.stringify(failure.data).includes('secret'));
});
test('teacher invitation validates school/email, reserves first, sends server redirect and binds returned Auth ID', async () => {
  const payload = { name: 'Teacher', email: 'new@test.invalid', schoolId: 'school-a' };
  assert.equal((await request('/api/admin/teachers/invite', 'admin', 'POST', { ...payload, email: 'invalid' })).status, 400);
  assert.equal((await request('/api/admin/teachers/invite', 'admin', 'POST', { ...payload, role: 'admin' })).status, 400);
  assert.equal((await request('/api/admin/teachers/invite', 'admin', 'POST', { ...payload, schoolId: 'inactive' })).status, 409);
  assert.equal((await request('/api/admin/teachers/invite', 'admin', 'POST', { ...payload, email: 'duplicate@test.invalid' })).status, 409);
  const start = calls.length;
  assert.equal((await request('/api/admin/teachers/invite', 'admin', 'POST', payload)).status, 201);
  const flow = calls.slice(start).filter(c => c.path.includes('/rpc/') || c.path.endsWith('/invite'));
  assert.deepEqual(flow.map(c => c.body.p_action || 'send'), ['invite_prepare', 'send', 'invite_finish']);
  assert.equal(flow[1].query.get('redirect_to'), 'https://edubuz.test/accept-invite');
  assert.deepEqual(flow[1].body.data, { name: 'Teacher' });
  assert.equal(flow[2].body.p_data.user_id, teacherId);
  const failed = await request('/api/admin/teachers/invite', 'admin', 'POST', { ...payload, email: 'fail@test.invalid' });
  assert.equal(failed.status, 502); assert.ok(!JSON.stringify(failed.data).includes('sensitive'));
  assert.equal(calls.at(-1).body.p_action, 'invite_failed');
});
test('teacher transfer validates destination; disabling and inactive schools deny existing teacher tokens', async () => {
  assert.equal((await request('/api/admin/teachers', 'admin')).status, 200);
  assert.equal((await request(`/api/admin/teachers/${teacherId}/school`, 'admin', 'PATCH', { schoolId: 'inactive' })).status, 409);
  assert.equal((await request(`/api/admin/teachers/${teacherId}/school`, 'admin', 'PATCH', { schoolId: 'school-b' })).status, 200);
  assert.equal((await request(`/api/admin/teachers/${teacherId}/status`, 'admin', 'PATCH', { isBlocked: 'false' })).status, 400);
  assert.equal((await request(`/api/admin/teachers/${teacherId}/status`, 'admin', 'PATCH', { isBlocked: true })).status, 200);
  assert.equal((await request('/api/auth/me', 'teacher')).status, 403);
  assert.equal((await request(`/api/admin/teachers/${teacherId}/status`, 'admin', 'PATCH', { isBlocked: false })).status, 200);
  assert.equal((await request('/api/auth/me', 'teacher')).status, 200);
  schoolActive = false;
  assert.equal((await request('/api/auth/me', 'teacher')).status, 403);
  schoolActive = true;
});
test('activation updates only verified teacher account and is idempotent after acceptance', async () => {
  assert.equal((await request('/api/auth/accept-invite', null, 'POST', { password: 'test-password' })).status, 401);
  assert.equal((await request('/api/auth/accept-invite', 'student', 'POST', { password: 'test-password' })).status, 403);
  assert.equal((await request('/api/auth/accept-invite', 'teacher', 'POST', { password: 'test-password', userId: 'admin' })).status, 400);
  assert.equal((await request('/api/auth/accept-invite', 'teacher', 'POST', { password: 'test-password' })).status, 200);
  const writes = calls.filter(c => c.path === '/auth/v1/admin/users/' + teacherId).length;
  const replay = await request('/api/auth/accept-invite', 'teacher', 'POST', { password: 'new-password' });
  assert.equal(replay.status, 200); assert.equal(replay.data.alreadyAccepted, true);
  assert.equal(calls.filter(c => c.path === '/auth/v1/admin/users/' + teacherId).length, writes);
});
