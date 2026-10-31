"""Run migrations/RLS/economy tests in a disposable Docker PostgreSQL database.

Never reads application .env files or connects to a configured Supabase project.
Requires a running Docker daemon and an existing postgres:16 image.
"""
import concurrent.futures
import json
from pathlib import Path
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parent
NAME = 'edubuz-test-' + uuid.uuid4().hex[:12]
S1 = '00000000-0000-4000-8000-000000000001'
S2 = '00000000-0000-4000-8000-000000000002'
T1 = '00000000-0000-4000-8000-000000000003'
T2 = '00000000-0000-4000-8000-000000000004'


def run(args, sql=None, check=True):
    result = subprocess.run(args, input=sql, text=True, encoding='utf-8', capture_output=True)
    if check and result.returncode:
        raise RuntimeError(result.stderr or result.stdout)
    return result


def query(sql, check=True):
    return run(['docker', 'exec', '-i', NAME, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres'], sql, check)


def scalar(sql):
    return query(sql).stdout.strip().splitlines()[-1]


def credit(request, delta=1, user=S1, label='NON_TOXIC'):
    return f"SELECT public.credit_learning_reward('{user}','{request}','conversation_completed',{delta},'{label}','test');"


def as_user(user, sql):
    return f"SET ROLE authenticated; SET request.jwt.claim.sub='{user}'; {sql}"


def denied(sql, contains):
    result = query(sql, check=False)
    assert result.returncode != 0 and contains in result.stderr, result.stderr


def main():
    run(['docker', 'image', 'inspect', 'postgres:16'])
    run(['docker', 'run', '--detach', '--rm', '--network', 'none', '--name', NAME,
         '--env', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:16'])
    try:
        for _ in range(40):
            if run(['docker', 'exec', NAME, 'pg_isready', '-U', 'postgres'], check=False).returncode == 0:
                break
            time.sleep(0.5)
        else:
            raise RuntimeError('Temporary PostgreSQL did not start')
        query("""
          CREATE ROLE anon NOLOGIN;
          CREATE ROLE authenticated NOLOGIN;
          CREATE ROLE service_role NOLOGIN BYPASSRLS;
          CREATE SCHEMA auth;
          CREATE TABLE auth.users(id UUID PRIMARY KEY);
          CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS
            $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
          GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
          GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
          ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;
        """)
        migrations = json.loads((ROOT/'migrations.json').read_text())
        for path in migrations:
            query((ROOT/path).read_text(encoding='utf-8'))
            if path.endswith('003_profile_gamification.sql'):
                query(f"""
                  INSERT INTO auth.users(id) VALUES('{S1}'),('{S2}'),('{T1}'),('{T2}');
                  INSERT INTO public.profiles(id,email,name,role,school_id,avatar) VALUES
                    ('{S1}','s1@test.invalid','S1','student','school-a','🦁'),
                    ('{S2}','s2@test.invalid','S2','student','school-b','🐼'),
                    ('{T1}','t1@test.invalid','T1','teacher','school-a','🦁'),
                    ('{T2}','t2@test.invalid','T2','teacher','school-b','🦁');
                  INSERT INTO public.student_gamification(student_id,xp,level) VALUES('{S1}',100,2);
                  INSERT INTO public.gamification_events(student_id,event_type,request_id,reward_delta,xp_after,moderation_label)
                    VALUES('{S1}','conversation_completed','historical',100,100,'SAFE');
                """)
            if path.endswith('004_avatar_economy.sql'):
                # Reproduce the legacy policy problem before migration 005.
                denied(as_user(S1, 'SELECT id FROM public.profiles;'), 'infinite recursion')
        print('PASS: migration manifest and historical 003->004 label/ownership upgrade; 005 resolves reproduced profile recursion')
        assert scalar("SELECT moderation_label FROM public.gamification_events WHERE request_id='historical';") == 'NON_TOXIC'
        assert scalar(f"SELECT equipped_avatar_id FROM public.profiles WHERE id='{S1}';") == 'lion'
        first = json.loads(scalar(credit('once')))
        again = json.loads(scalar(credit('once')))
        assert first['xp'] == 101 and again['xp'] == 101 and again['rewardDelta'] == 0
        result = json.loads(scalar(f"SELECT public.unlock_avatar('{S1}','runner');"))
        assert result['remainingExp'] == 1
        repeat = json.loads(scalar(f"SELECT public.unlock_avatar('{S1}','runner');"))
        assert repeat['alreadyOwned'] and repeat['expSpent'] == 0
        assert scalar(f"SELECT xp||':'||level||':'||exp_spent FROM public.student_gamification WHERE student_id='{S1}';") == '101:2:100'
        denied(f"SELECT public.unlock_avatar('{S1}','dragon');", 'INSUFFICIENT_EXP')
        denied(f"SELECT public.equip_avatar('{S2}','runner');", 'AVATAR_NOT_OWNED')
        denied(credit('toxic-invalid', 1, label='TOXIC'), 'INVALID_REWARD')
        query(f"SELECT public.equip_avatar('{S1}','runner'); UPDATE public.avatar_catalog SET is_active=false WHERE id='runner'; SELECT public.equip_avatar('{S1}','runner');")
        print('PASS: reward replay, XP/EXP separation, repeat unlock, insufficient EXP, ownership, toxic gate, retired owned equip')
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(lambda _: query(credit('same-concurrent')), range(12)))
            list(pool.map(lambda i: query(credit(f'distinct-{i}')), range(20)))
        assert scalar(f"SELECT xp FROM public.student_gamification WHERE student_id='{S1}';") == '122'
        query(credit('fund-spending', 1000))
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            futures = [pool.submit(query, f"SELECT public.unlock_avatar('{S1}','dragon');") for _ in range(8)]
            futures += [pool.submit(query, credit(f'earn-during-spend-{i}')) for i in range(8)]
            for future in futures: future.result()
        assert scalar(f"SELECT xp||':'||exp_spent FROM public.student_gamification WHERE student_id='{S1}';") == '1130:600'
        assert scalar(f"SELECT count(*) FROM public.gamification_events WHERE student_id='{S1}' AND event_type='avatar_unlocked' AND avatar_id='dragon';") == '1'
        print('PASS: concurrent duplicate rewards, independent rewards, duplicate purchases and earning/spending share a row lock')
        assert scalar(as_user(S1, 'SELECT count(*) FROM public.profiles;')) == '1'
        assert scalar(as_user(T1, 'SELECT count(*) FROM public.profiles;')) == '2'
        assert scalar(as_user(S2, 'SELECT count(*) FROM public.student_gamification;')) == '0'
        query(as_user(S1, f"UPDATE public.profiles SET name='Updated' WHERE id='{S1}';"))
        for sql in [f"UPDATE public.profiles SET role='teacher' WHERE id='{S1}';",
                    f"UPDATE public.profiles SET avatar='🐉' WHERE id='{S1}';",
                    f"UPDATE public.student_gamification SET xp=99999 WHERE student_id='{S1}';",
                    f"SELECT public.unlock_avatar('{S1}','astronaut');", credit('browser-forged', 1000)]:
            denied(as_user(S1, sql), 'permission denied')
        assert scalar("SELECT has_table_privilege('authenticated','public.profiles','INSERT');") == 'f'
        assert scalar("SELECT has_table_privilege('anon','public.profiles','UPDATE');") == 'f'
        query('SET ROLE service_role; ' + credit('server-authorized', user=S2))
        print('PASS: own/same-school reads, protected profile/economy writes denied, service_role credit allowed')
        def strike(user, school, request):
            return f"SELECT public.record_student_strike('{user}','{school}','{request}','test message',ARRAY['test']);"
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(lambda _: query(strike(S1, 'school-a', 'same-strike')), range(12)))
        assert scalar(f"SELECT strike_count FROM public.profiles WHERE id='{S1}';") == '1'
        query(strike(S2, 'school-b', 'same-strike'))
        assert scalar("SELECT count(*) FROM public.violations WHERE request_id='same-strike';") == '2'
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(lambda i: query(strike(S1, 'school-a', f'unique-strike-{i}')), range(8)))
        assert scalar(f"SELECT strike_count||':'||is_blocked FROM public.profiles WHERE id='{S1}';") == '3:true'
        assert scalar(f"SELECT count(*) FROM public.teacher_notifications WHERE student_id='{S1}';") == '3'
        denied(f"SELECT public.reset_student_strikes('{S1}','{T2}','school-b',null);", 'STUDENT_NOT_FOUND')
        denied(f"SELECT public.reset_student_strikes('{S1}','{S2}','school-b',null);", 'TEACHER_NOT_AUTHORIZED')
        query(f"SELECT public.reset_student_strikes('{S1}','{T1}','school-a','reviewed');")
        assert scalar(f"SELECT strike_count||':'||is_blocked FROM public.profiles WHERE id='{S1}';") == '0:false'
        assert scalar(f"SELECT count(*) FROM public.strike_resets WHERE student_id='{S1}';") == '1'
        query(strike(S1, 'school-a', 'same-strike'))
        assert scalar(f"SELECT strike_count FROM public.profiles WHERE id='{S1}';") == '0'
        denied(as_user(S1, strike(S1, 'school-a', 'forged')), 'permission denied')
        print('PASS: concurrent strikes cap at three, owner-scoped IDs, same-school reset/audit, old replay after reset and forbidden caller')
        # Any failure after balance mutation must roll back the transaction/event.
        query("CREATE FUNCTION public.fail_test_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test rollback'; END $$; CREATE TRIGGER fail_test_event BEFORE INSERT ON public.gamification_events FOR EACH ROW EXECUTE FUNCTION public.fail_test_event();")
        denied(credit('rollback', 100), 'test rollback')
        assert scalar(f"SELECT xp FROM public.student_gamification WHERE student_id='{S1}';") == '1130'
        print('PASS: event-write failure rolls back XP credit')
        query('CREATE TRIGGER fail_strike_notice BEFORE INSERT ON public.teacher_notifications FOR EACH ROW EXECUTE FUNCTION public.fail_test_event();')
        denied(strike(S1, 'school-a', 'rollback-strike'), 'test rollback')
        assert scalar(f"SELECT strike_count FROM public.profiles WHERE id='{S1}';") == '0'
        assert scalar("SELECT count(*) FROM public.violations WHERE request_id='rollback-strike';") == '0'
        query('CREATE TRIGGER fail_reset_audit BEFORE INSERT ON public.strike_resets FOR EACH ROW EXECUTE FUNCTION public.fail_test_event();')
        denied(f"SELECT public.reset_student_strikes('{S2}','{T2}','school-b',null);", 'test rollback')
        assert scalar(f"SELECT strike_count FROM public.profiles WHERE id='{S2}';") == '1'
        print('PASS: failed teacher notification rolls back strike; failed audit rolls back reset')
    finally:
        # Only this randomly named disposable container is removed; no host files/volumes are mounted.
        run(['docker', 'rm', '--force', NAME], check=False)


if __name__ == '__main__':
    main()
