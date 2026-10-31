# Admin EduBuz: Implementation and Setup

Updated: 2026-09-28. Local implementation and checks are complete; live Supabase migration and real email delivery have not been performed.

## 1. Initial State

React/Vite, Express, Supabase Auth, protected role routes, student/teacher/parent profiles, school-scoped teacher APIs, email password recovery, and is_blocked already existed. There was no admin role, school entity or teacher invitation workflow. Registration derived school membership from email domains.

## 2. Architecture

The same frontend, Express server, Supabase project and authentication are used. Admin opens /login/admin (the existing Login component), then /admin/dashboard. Login redirects according to the database profile role even when entered through another login role URL. Parent remains supported. No public admin registration exists.

## 3. Database

Apply [migration 007](../supabase/migrations/007_admin_schools.sql) after 001, 002, nested 003, 004, 005 and 006, following [migrations.json](../supabase/migrations.json). Check actual migration history first; do not rerun the entire chain against an existing database.

- schools: TEXT id, name, unique code, is_active, created_at, updated_at. New IDs are generated UUID strings; old nonempty profile school IDs are preserved and seeded as schools with LEGACY-* codes. These are historical groups requiring administrator review, not verified institutions.
- profiles: role constraint adds admin; school_id stays TEXT, becomes nullable, and references schools.id. Empty legacy school IDs become NULL. No profile or incident history is deleted.
- teacher_invitations: unique normalized email, name, school_id, invited_by, user_id, pending/sent/failed/accepted status and timestamps. Invitation state is separate from is_blocked.
- admin_audit_events: server-only administrative audit. Existing gamification_events and strike_resets are not reused because their event/ownership contracts are specific to rewards and student discipline.
- admin_manage: service-role-only RPC rechecks an active admin and commits each DB mutation with its audit. School changes and teacher moves validate actual school records. Profile insertion never promotes an existing profile.
- accept_teacher_invitation records acceptance once. Password is never stored in audit data.
- Teacher RLS policies from both 001 and 003 now use is_school_teacher; blocked teachers/inactive schools cannot retain notification/reset access through older permissive policies.
- record_student_strike supports unassigned students without joining them to a school. Incident school text and historical records are retained.

Migration preflight: inspect custom role constraints, auth.users triggers, and extra policies in your deployed project. Repository tests cover the supplied migrations; undocumented production customizations need separate review. A custom Auth trigger that automatically creates profiles can conflict with invite_finish's deliberate insert-only behavior; reconcile that trigger before enabling invitations, never resolve it by blindly promoting existing profiles.

## 4. Backend

Admin routes use requireAuth + requireRole('admin'). Controllers whitelist fields and validate strings, email, code, UUID teacher IDs and boolean status. Service functions use the server Supabase client. List queries fetch pages so counts are not silently truncated by the default row limit.

Public registration rejects teacher/admin role escalation and supplied schoolId/school_id. New student/parent accounts remain unassigned (NULL school_id). Trusted student-school assignment is currently a manual administrative data operation; student enrollment management is outside this MVP. Existing assigned students keep their school.

Teacher login and every authenticated teacher API request check is_blocked and an active school. Existing access tokens do not bypass these checks. Deactivating a school suspends teacher access while preserving data; it does not block student learning. Moving a teacher changes the current school scope; historical incidents stay with their original school.

## 5. Frontend

AdminDashboard uses the existing warm palette, AccountMenu, API client and role wrappers. It provides actual school/teacher counts, school creation/edit/status, school filters, invitation form, teacher transfer/status, and unfinished invitation states. Tables scroll inside their container on small screens. Loading, failure, success and duplicate-submit states are explicit.

AcceptInvite processes the Supabase session from the email link and submits a new password through an authenticated teacher endpoint. Successful activation clears the local session and links to Login Guru. Public registration only offers student/parent. Existing domain-derived login labels/fallbacks and unused direct browser profile-upsert registration have been removed.

## 6. Authentication

Admin uses the existing backend password login and browser Supabase session. The frontend URL role and user metadata never establish authority. Parent, teacher and student destinations remain compatible with existing routes; student destination is /student/chat.

## 7. Authorization

Missing/invalid session: 401. Authenticated non-admin on admin API: 403. Blocked accounts and teachers in inactive/unassigned schools: 403. Database/RPC failures return generic actionable errors without provider internals. Privileged tables have RLS enabled with no browser grants. Admin is an application profile role, not a Supabase service-role token.

Browser users cannot update role, school_id or is_blocked. No general-purpose user-role mutation endpoint exists. Teacher status reuses is_blocked; reactivation requires an active assigned school to regain access.

## 8. API

All /api/admin endpoints require an unblocked administrator.

| Method | Path | Body / result |
| --- | --- | --- |
| GET | /api/admin/schools | School rows with teacher_count |
| POST | /api/admin/schools | name, code |
| PATCH | /api/admin/schools/:schoolId | name, code and/or is_active |
| GET | /api/admin/teachers | teachers and invitations arrays |
| POST | /api/admin/teachers/invite | name, email, schoolId; server decides role and Auth user ID |
| PATCH | /api/admin/teachers/:teacherId/school | schoolId |
| PATCH | /api/admin/teachers/:teacherId/status | isBlocked boolean |
| POST | /api/auth/accept-invite | Authenticated teacher; password (8..128 characters) |

Admin responses use success/data; errors use error. Create/invite succeeds with 201; reads/updates with 200. Invalid fields: 400; missing school/teacher: 404; duplicate code/email or unavailable school: 409; Auth invitation failure: 502; unavailable DB/configuration: 503.

## 9. New Files

- supabase/migrations/007_admin_schools.sql
- supabase/test_admin.cjs
- backend-vite/src/routes/adminRoutes.ts
- backend-vite/src/controllers/adminController.ts
- backend-vite/src/controllers/invitationController.ts
- backend-vite/src/services/adminService.ts
- backend-vite/test/admin.test.cjs
- frontend-vite/src/config/roles.ts
- frontend-vite/src/services/adminApi.ts
- frontend-vite/src/pages/AdminDashboard.tsx
- frontend-vite/src/pages/AcceptInvite.tsx
- frontend-vite/test/admin.browser.cjs
- docs/07-ADMIN-SETUP.md

## 10. Modified Files

- supabase/migrations.json
- backend-vite/.env.example
- backend-vite/src/server.ts
- backend-vite/src/middleware/auth.ts
- backend-vite/src/routes/authRoutes.ts
- backend-vite/src/controllers/authController.ts
- backend-vite/test/apiBoundaries.test.cjs
- frontend-vite/src/routes.ts
- frontend-vite/src/components/ProtectedRoute.tsx
- frontend-vite/src/components/AccountMenu.tsx
- frontend-vite/src/hooks/useHomeAccount.ts
- frontend-vite/src/store/authStore.ts
- frontend-vite/src/pages/Login.tsx
- frontend-vite/src/pages/Register.tsx
- README.md, frontend-vite/README.md, backend-vite/README.md
- docs/01-SYSTEM-ARCHITECTURE.md through docs/06-PROJECT-TASKS.md

## 11. Testing

2026-09-28 local checks: backend build, frontend build and lint pass; backend suite has 21 passing tests. Build retains the existing >500 kB main-chunk warning. Admin authorization tests cover every endpoint for anonymous/student/teacher/parent/blocked-admin identities; tests also cover invalid payloads, duplicate email/code, inactive schools, actor ownership, server redirects, provider failures, teacher transfer/disable and activation replay.

Disposable PGlite PostgreSQL executes migrations 001-007 and asserts legacy IDs, foreign keys, school CRUD, invitation uniqueness/acceptance, teacher transfer/status, unassigned strikes, browser privilege denial, effective blocked/inactive-teacher policies and audit rollback. It does not establish multi-connection concurrency or production configuration.

Headless Edge browser tests use HTTP fixtures and cover admin login, anonymous/non-admin redirects, school creation, invitation, transfer/disable, password activation and a 390px layout. They do not send real email or contact live Supabase.

Run from each component: npm.cmd run build; frontend npm.cmd run lint; backend npm.cmd test. Optional test tools were installed outside the repository; no application dependency was changed:

```powershell
npm.cmd install --prefix "$env:TEMP\edubuz-verification" --no-save --package-lock=false @electric-sql/pglite playwright
$env:NODE_PATH = "$env:TEMP\edubuz-verification\node_modules"
node supabase/test_admin.cjs
node frontend-vite/test/admin.browser.cjs
```

The browser test requires installed Microsoft Edge and available port 5176. The pre-existing Docker test remains available as supabase/test_local.py; Docker was unavailable in this session. No production migrations were applied.

## 12. Manual Supabase Setup and First Admin

1. Back up and inspect the deployed migration history. Apply missing migrations in manifest order through 007 using Supabase SQL Editor or your existing migration process.
2. Configure backend APP_URL to the frontend origin (local example: http://localhost:5175). Keep SUPABASE_SERVICE_ROLE_KEY only in backend environment. Configure CORS_ORIGINS for the frontend origin.
3. In Supabase Authentication URL Configuration, allow the exact frontend /accept-invite redirect, plus /reset-password for recovery. Configure the Site URL and email/SMTP provider. Keep the invite email template's confirmation link intact. Supabase requires the redirect to be allowlisted: [official invitation guidance](https://supabase.com/docs/guides/auth/users).
4. In Supabase Authentication -> Users, manually create the first admin Auth user with an administrator-controlled email and a strong password. Copy its UUID. Do not add a public admin signup page.
5. Run this reviewed data setup in SQL Editor, replacing only the UUID and display name. It reads the email from the existing Auth row and grants the application admin role:

```sql
INSERT INTO public.profiles (id, email, name, role, school_id, is_blocked, strike_count)
SELECT id, email, 'Admin EduBuz', 'admin', NULL, false, 0
FROM auth.users
WHERE id = 'REPLACE_WITH_AUTH_USER_UUID'::uuid
ON CONFLICT (id) DO UPDATE
SET role = 'admin', school_id = NULL, is_blocked = false
RETURNING id, email, role;
```

6. Confirm exactly the intended account was returned. Login at /login/admin. Open /admin/dashboard; create or review schools. Imported LEGACY groups need proper names/codes and real institution review.
7. Invite a teacher by name/email and select an active school. The server reserves the email, calls Supabase inviteUserByEmail, then inserts the teacher profile with the chosen school and marks the invitation sent. The teacher opens the email link, sets a password on /accept-invite, then uses Login Guru. [Supabase invitation API](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail).
8. Verify the teacher only sees the assigned school. Disable the teacher and confirm an existing session receives 403; reactivate and retest. Also test school deactivation.

Auth/email and database writes cannot share one transaction. A timeout or failure can leave an Auth user/email without a completed profile. Pending/failed reservations are retained and shown in the dashboard to prevent duplicate sends. Do not blindly delete Auth users or change an existing account's role. Before retrying, inspect the reservation, Auth user, profile and audit together. If Auth exists without a profile, confirm identity and school and complete the insertion using the service-role-only admin_manage invite_finish operation under a verified admin; a failed reservation must first be reviewed and reset to pending by an authorized database operator. If Auth never created the account, an authorized operator may clear the failed reservation after recording the incident, then submit a new invitation. Automated resend/reconciliation is not part of this MVP.

A sent-but-expired link can use the existing password-recovery flow; after establishing the correct teacher session, visit /accept-invite to finish activation. Verify this path with your actual Supabase email configuration before rollout.

## 13. Remaining Tasks

- Apply/review 007 on the intended Supabase project and inspect any custom Auth triggers/policies.
- Create the first admin and configure APP_URL, email provider and redirect allowlist.
- Verify real email receipt, link expiry, password activation and login in a deployed environment.
- Review legacy domain groups before treating them as real schools; place newly registered students through a trusted administrative process. No student self-assignment is supported.
- Optional follow-up: invitation resend/reconciliation UI, student enrollment management and invitation rate limits.
- Multi-connection PostgreSQL concurrency and production operations remain separate from the local PGlite checks.
