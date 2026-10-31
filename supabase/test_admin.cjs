// Disposable in-memory PostgreSQL checks. Requires @electric-sql/pglite via NODE_PATH.
// Does not read .env or connect to Supabase. Run: node supabase/test_admin.cjs
const { PGlite } = require('@electric-sql/pglite');
const { pgcrypto } = require('@electric-sql/pglite/contrib/pgcrypto');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const admin = '00000000-0000-4000-8000-000000000010';
const student = '00000000-0000-4000-8000-000000000011';
const teacher = '00000000-0000-4000-8000-000000000012';
const invited = '00000000-0000-4000-8000-000000000013';
const unassigned = '00000000-0000-4000-8000-000000000014';
async function main() {
 const db = new PGlite({ extensions: { pgcrypto } });
 try {
  await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
   CREATE SCHEMA auth; CREATE TABLE auth.users(id UUID PRIMARY KEY);
   CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
   GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;`);
  const migrations = JSON.parse(fs.readFileSync(path.join(__dirname, 'migrations.json'), 'utf8'));
  for (const migration of migrations) {
   await db.exec(fs.readFileSync(path.join(__dirname, migration), 'utf8'));
   if (migration.endsWith('006_atomic_strikes.sql')) {
    await db.exec(`INSERT INTO auth.users VALUES('${admin}'),('${student}'),('${teacher}'),('${invited}'),('${unassigned}');
      INSERT INTO profiles(id,email,name,role,school_id) VALUES
      ('${admin}','admin@test.invalid','Admin','student',''),
      ('${student}','student@test.invalid','Student','student','legacy-school'),
      ('${teacher}','teacher@test.invalid','Teacher','teacher','legacy-school'),
      ('${unassigned}','unassigned@test.invalid','Unassigned','student','');`);
   }
  }
  const scalar = async (sql, args) => Object.values((await db.query(sql,args)).rows[0])[0];
  assert.equal(await scalar(`SELECT school_id FROM profiles WHERE id='${student}'`), 'legacy-school');
  assert.equal(await scalar(`SELECT school_id FROM profiles WHERE id='${unassigned}'`), null);
  assert.equal(await scalar("SELECT count(*)::integer FROM schools WHERE id='legacy-school'"), 1);
  await db.exec(`UPDATE profiles SET role='admin' WHERE id='${admin}'; SET ROLE service_role;`);
  const manage = async (action, target, data, actor = admin) => scalar('SELECT admin_manage($1,$2,$3,$4)', [actor,action,target,JSON.stringify(data)]);
  await assert.rejects(manage('school_create',null,{ name:'Bad',code:'BAD' },student), /ADMIN_REQUIRED/);
  const school = await manage('school_create',null,{ name:'School A',code:'A' });
  assert.ok(school.id); assert.equal(school.is_active,true);
  await assert.rejects(manage('school_create',null,{ name:'Duplicate',code:'A' }), /unique constraint/);
  await manage('school_update',school.id,{ name:'School renamed',is_active:false });
  await assert.rejects(manage('invite_prepare',null,{name:'New teacher',email:'new@test.invalid',school_id:school.id}), /SCHOOL_UNAVAILABLE/);
  await manage('school_update',school.id,{is_active:true});
  const reservation = await manage('invite_prepare',null,{name:'New teacher',email:'new@test.invalid',school_id:school.id});
  await assert.rejects(manage('invite_prepare',null,{name:'Other',email:'new@test.invalid',school_id:school.id}), /unique constraint/);
  await manage('invite_finish',reservation.id,{user_id:invited});
  assert.deepEqual((await db.query('SELECT role,school_id FROM profiles WHERE id=$1',[invited])).rows[0],{role:'teacher',school_id:school.id});
  await scalar('SELECT accept_teacher_invitation($1)',[invited]);
  await scalar('SELECT accept_teacher_invitation($1)',[invited]);
  assert.equal(await scalar("SELECT count(*)::integer FROM admin_audit_events WHERE action='invite_accepted'"),1);
  await manage('teacher_school',teacher,{school_id:school.id});
  await db.query("INSERT INTO teacher_notifications(school_id,student_id,student_name,strike_level,type,title,description) VALUES($1,$2,'Student',1,'strike_warning','Test','Test')",[school.id,student]);
  await manage('teacher_status',teacher,{is_blocked:true});
  assert.equal(await scalar('SELECT is_blocked FROM profiles WHERE id=$1',[teacher]),true);
  await db.exec(`RESET ROLE; SET ROLE authenticated; SET request.jwt.claim.sub='${teacher}';`);
  assert.equal(await scalar('SELECT count(*)::integer FROM teacher_notifications'),0);
  await db.exec('RESET ROLE; SET ROLE service_role;');
  await manage('teacher_status',teacher,{is_blocked:false});
  await assert.rejects(manage('teacher_status',student,{is_blocked:true}),/TEACHER_NOT_FOUND/);
  await assert.rejects(manage('invite_prepare',null,{name:'Existing',email:'student@test.invalid',school_id:school.id}),/EMAIL_EXISTS/);
  const failed = await manage('invite_prepare',null,{name:'Failure',email:'failure@test.invalid',school_id:school.id});
  await manage('invite_failed',failed.id,{});
  assert.equal(await scalar('SELECT status FROM teacher_invitations WHERE id=$1',[failed.id]),'failed');
  // Unassigned students can still receive strikes; they cannot join a teacher school implicitly.
  const strike = await scalar('SELECT record_student_strike($1,$2,$3,$4,$5)',[unassigned,'','unassigned-strike','toxic',[]]);
  assert.equal(strike.strikeCount,1);
  await db.exec(`RESET ROLE; SET ROLE authenticated; SET request.jwt.claim.sub='${student}';`);
  await assert.rejects(manage('school_create',null,{name:'Escalation',code:'NO'}),/permission denied/);
  await assert.rejects(db.exec(`UPDATE profiles SET role='admin' WHERE id='${student}'`),/permission denied/);
  await assert.rejects(db.exec(`UPDATE profiles SET school_id='${school.id}' WHERE id='${student}'`),/permission denied/);
  await assert.rejects(db.exec('SELECT * FROM teacher_invitations'),/permission denied/);
  await db.exec(`SET request.jwt.claim.sub='${teacher}';`);
  assert.equal(await scalar('SELECT is_school_teacher($1)',[school.id]),true);
  await db.exec('RESET ROLE; SET ROLE service_role;');
  await manage('school_update',school.id,{is_active:false});
  await db.exec(`RESET ROLE; SET ROLE authenticated; SET request.jwt.claim.sub='${teacher}';`);
  assert.equal(await scalar('SELECT is_school_teacher($1)',[school.id]),false);
  assert.equal(await scalar('SELECT count(*)::integer FROM teacher_notifications'),0);
  await db.exec('RESET ROLE;');
  // An audit insert failure must roll back the administrative mutation.
  await db.exec(`CREATE FUNCTION public.reject_admin_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TEST_AUDIT_FAILURE'; END $$;
   CREATE TRIGGER reject_admin_audit BEFORE INSERT ON admin_audit_events FOR EACH ROW EXECUTE FUNCTION public.reject_admin_audit(); SET ROLE service_role;`);
  await assert.rejects(manage('school_create',null,{name:'Rollback',code:'ROLLBACK'}),/TEST_AUDIT_FAILURE/);
  assert.equal(await scalar("SELECT count(*)::integer FROM schools WHERE code='ROLLBACK'"),0);
  console.log('PASS: migrations 001-007, legacy IDs/FK, schools, invite/replay/acceptance, teacher transfer/status, unassigned strikes, RLS and transactional audit rollback');
 } finally { await db.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode=1; });
