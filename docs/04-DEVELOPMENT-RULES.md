# Development Rules & Guidelines

Last inspected: 2026-09-28. These are documentation conventions for human contributors and AI agents, not a claim that CI enforces every rule.

## 1. Purpose

Keep changes understandable, focused, secure, and consistent with the actual React/Express/Supabase/Python implementation. Source code is implementation truth; documentation must be reconciled when it disagrees. See [architecture](01-SYSTEM-ARCHITECTURE.md) and [memory](02-PROJECT-MEMORY.md).

## 2. General Engineering Principles

1. **Understand Before Changing:** inspect entry points, callers, schema, and existing behavior.
2. **Minimal Change:** solve the requested problem and preserve unrelated work.
3. **Reuse Before Creating:** check existing pages, components, services, and helpers.
4. **No Unnecessary Dependencies:** justify a new dependency with a concrete requirement and compatibility review.
5. **Explicit Over Clever:** use clear types, names, and control flow; document units and ownership.
6. **Fail Safely:** distinguish infrastructure failure from toxic student input.
7. **Security First:** enforce identity/role/school/ownership server-side and protect secrets.
8. **Keep Frontend and Backend Contracts Consistent:** coordinate browser, Express, Python, and SQL changes.

## 3. AI Coding Agent Rules

Before editing, read memory, architecture, and these rules; use PRD/design/tasks for relevant context. Inspect current source and git status, check existing implementations, and identify affected callers. Make minimal changes, preserve contracts and database compatibility unless the task calls for changes, and never expose secrets.

Explain material architectural changes, run appropriate checks, report files changed and unresolved issues, and update the affected docs. Do not invent services/endpoints, duplicate existing utilities, replace working libraries without a reason, or infer completion from a UI placeholder. No rule here requires permission for ordinary authorized local fixes.

## 4. Technology Coding Standards

### TypeScript / JavaScript

Use PascalCase for components/types and camelCase for variables/functions. Define boundary types rather than adding broad any types; validate runtime input because types do not validate network data. Await async operations deliberately, handle rejected promises, and do not swallow state-write failures. Follow local import/export and formatting style; named service exports and default page exports already exist. Do not apply unrelated formatting churn.

### React

Keep components focused on presentation and interaction. Type props, call hooks unconditionally, keep derived values out of duplicated state, and clean up timers/effects. Put reusable request handling in apiClient.ts and business authority on the server. Extract shared UI when actual repetition justifies it; there is no mandatory existing hooks library or Zustand store to extend.

### Backend

Routes bind methods/middleware; controllers validate HTTP input and map responses; services implement orchestration/persistence. Use 400 for invalid input, 401 for invalid/missing authentication, 403 for denied access, and 500 for unexpected failures where consistent with existing contracts. Chat also uses business statuses inside HTTP 200; do not silently replace that behavior.

### Python

Preserve FastAPI/Pydantic validation, snake_case wire fields, stateless reward evaluation, and explicit environment handling. Keep reward points/levels testable without a running server. requirements.txt is broad; requirements-tested.txt records pinned top-level versions. Keep both roles explicit; the snapshot is not a full transitive lockfile.

### Database

Keep snake_case schema names, explicit keys/constraints/indexes, and reviewed RLS. Inspect all existing migrations before adding schema changes. Backend service-role access still needs application authorization.

## 5. Project Structure Rules

| Code | Existing destination / rule |
| --- | --- |
| Pages | frontend-vite/src/pages |
| Reusable UI | frontend-vite/src/components |
| API client/types | frontend-vite/src/services/apiClient.ts |
| Auth/strike helpers | frontend-vite/src/store |
| Browser Supabase | frontend-vite/src/lib/supabase.ts |
| Hooks/utilities | frontend-vite/src/hooks: useTheme, useHomeAccount and useDesktopNavigation; extend existing helpers where appropriate |
| Avatar card presentation | frontend-vite/src/config/avatarCards.ts and public/avatars; server catalog controls prices/ownership |
| Backend routes/controllers/services/middleware | Matching directories in backend-vite/src |
| SQL migrations | supabase/migrations; reconcile nested 003 discovery before changing layout |
| Backend tests | backend-vite/test |
| Reward calculator | reward-gamification-api/reward_api.py |
| Frontend/Python automated tests | Python: reward-gamification-api/test_reward_api.py (unittest); no established frontend automated suite |

## 6. Naming Conventions

Use existing PascalCase TSX page/component files, camelCase TS service/controller files, and descriptive lower-case folder names. Classes/types use PascalCase if introduced; there is no requirement to convert functional services into classes. REST paths use lower-case nouns/actions consistent with /api/me and /api/teacher. SQL uses snake_case; Python fields use snake_case; TS/browser shapes often use camelCase. Map explicitly at boundaries rather than renaming wire fields invisibly.

## 7. Component Rules

Give each component one coherent responsibility. There is no approved line-count limit; extract when reuse, state complexity, or testability warrants it. Use typed props and minimal local state, keep effects tied to actual dependencies, and avoid copying server authority into browser-only rules. Shared buttons/modals are not existing infrastructure merely because inline versions appear on multiple pages.

## 8. API Rules

Check mounted routes in server.ts and route modules. Preserve HTTP method, path, authentication, field names, units, nullability, and response envelope. Validate input before mutation and use authenticated identity for ownership. Standard success/data and auth message/user/session responses currently coexist; document exceptions. Error responses must help callers recover without adding credentials/internal sensitive data. Use explicit schema/contract changes rather than silent compatibility breaks.

## 9. Frontend–Backend Contract Rules

When changing a contract:

1. Update backend behavior and validation.
2. Update frontend API helpers.
3. Update affected TS types, Python models, and SQL constraints as applicable.
4. Verify accepted and invalid request payloads.
5. Verify success/error response shapes, nullability, and units.
6. Update architecture, memory, and tasks.

Cover initial-load and post-mutation responses separately. GET/chat include levelInfo and expBalance; apiClient normalizes xp/newXp and numeric/nested levels. Feedback remains snake_case. progress_to_next_level is a 0..1 fraction, not a percentage. Preserve the distinction between lifetime XP and spendable EXP.

## 10. Database Rules

Use migration files for schema changes, including upgrades for existing data. CREATE TABLE IF NOT EXISTS is not an upgrade for an existing constraint. Verify seeds do not overwrite live progress. Review backward compatibility, duplicate handling, transactions, RLS, and permissions; test on a disposable database when possible. Do not manually change production schema outside the appropriate migration process. Do not assume nested 003 is automatically discovered. Apply 001 -> 002 -> nested 003 -> 004 -> 005 -> 006 -> 007 before the matching backend. Migration 004 is not safe for blind repeat execution. Preserve credit_learning_reward/unlock_avatar row locking, transactional event writes, ownership constraints, and server-only grants. Never replace them with client-calculated balances or stale total upserts.

## 11. Authentication Rules

Admin rules: keep parent/student/teacher compatibility; authorize /api/admin/* with verified database role, never URL role or user metadata. Do not expose public admin registration. Use migration 007 and server-only admin_manage for audited changes. Reuse is_blocked for teacher access. School identity comes from profiles.school_id -> schools.id, never an email-domain fallback. Do not allow public callers to set school_id. Keep invitation status separate from access status and preserve failed reservations for review. Configure APP_URL server-side and allowlist /accept-invite in Supabase. [Manual provisioning and failure recovery](07-ADMIN-SETUP.md#12-manual-supabase-setup-and-first-admin).


Supabase sessions and verified bearer tokens establish identity; localStorage metadata does not. Keep passwords/tokens out of logs/docs and avoid storing passwords as local account data. Protected frontend UX cannot replace backend checks. Teacher actions require trusted role and school scope; public teacher registration must remain rejected; chat and /api/me require the student role. Preserve blocked-account behavior. Never describe a locally generated OTP as proof of email ownership.

Supabase client rule (AUTH-05): use a fresh createLoginClient() per password-login request. Never call signInWithPassword, setSession, or other session-changing methods on shared supabaseAdmin. persistSession: false does not prevent in-memory session replacement. Verify post-login writes retain server authorization when modifying auth.

## 12. Environment Variable Rules

Never commit API keys, passwords, bearer tokens, or service credentials. Use .env.example for variable names/placeholders when an example is added; examples now exist for backend and reward configuration. Browser VITE variables are public. Follow the [environment inventory](01-SYSTEM-ARCHITECTURE.md#13-environment-configuration). Python reads process environment, so do not assume .env auto-loading. Explain configuration changes and required restarts without including secret values.

## 13. Error Handling

Frontend: show a clear message, preserve relevant input, distinguish unauthorized/blocked/outage states, and offer safe retry. Backend: validate early, handle rejected service calls, avoid leaking secrets, and preserve actionable status/error contracts. Database/API failures must not be reported as successful persistence. A moderation outage must block generation without assigning a student strike. Avoid blind retries for non-idempotent writes.

## 14. Loading / Empty / Error States

For each major UI flow review loading, success, empty, error, unauthorized, and relevant offline/network states. Prevent duplicate submissions while busy. Do not display empty data as if a failed fetch succeeded. Reward defaults must not masquerade as verified progress. A blocked student needs clear next-step guidance.

## 15. Testing Rules

Current backend tests use Node's test runner with ts-node; Python unittest covers reward rules/validation/authentication, and supabase/test_local.py checks migrations in disposable Docker PostgreSQL. Reward PowerShell checks remain manual HTTP smoke calls. frontend-vite/test/admin.browser.cjs provides fixture browser coverage for admin routing and workflows; it is not a full-app browser suite.

Use unit checks for isolated reward/normalization logic; integration/API tests for validation, authentication, ownership, and persistence; regression tests for retries, outages, toxic output, and concurrency when touched. UI changes need appropriate build/lint and affected-state inspection. Do not add tests that merely copy implementation or over-test reversible documentation changes.

Backend fixtures now use NON_TOXIC/TOXIC, generator request_id and RPC-based +1 chat credit. API boundary tests cover role, feedback, avatar and school rules. Keep these contracts current; passing stub tests do not prove deployed service/RLS correctness.

## 16. Git Rules

No enforced branch/commit convention is established. Proposed convention: descriptive branches such as fix/reward-contract or docs/project-context and concise imperative commits describing one change. PRs should state the problem, final behavior, validation, and remaining limitations. Follow any real repository review policy when available; none is invented here. Stage only relevant files and never restore/delete unrelated workspace changes as cleanup.

## 17. Code Review Checklist

- [ ] Correct requested functionality and scope.
- [ ] No unnecessary changes or duplicated services.
- [ ] No secrets or inappropriate logging.
- [ ] API/schema contracts preserved or explicitly updated.
- [ ] Authentication, role, school, and ownership boundaries checked.
- [ ] Error handling and retry behavior verified.
- [ ] Loading and empty states considered.
- [ ] Relevant tests/checks completed with results recorded.
- [ ] Documentation and task status updated.

## 18. Definition of Done

The deliverable exists, acceptance criteria are satisfied, relevant checks pass, and no known critical regression remains in the changed scope. Contracts/types/migrations are updated together where needed; documentation reflects final behavior. Source presence alone does not certify deployment or complete integration. If a required check cannot run, report that limitation and use REVIEW rather than DONE for the unverified work.

## 19. Forbidden Practices

Do not switch to inactive App.tsx routes accidentally, reintroduce browser-authoritative strikes/XP, penalize students for AI output/outages, expose service-role keys, invent missing .env examples, overwrite progress totals outside the reward RPC, or mark static parent data as live monitoring. Do not silently repair unrelated bugs during a documentation task. Do not replace dependencies/frameworks merely because old artifacts coexist.

## 20. Development Workflow

Understand -> Plan -> Implement -> Test -> Review -> Document.

Inspect callers and current git state, choose the smallest coherent implementation, verify behavior at affected boundaries, inspect the diff, and update the relevant living documents. For documentation-only changes, validate filenames, headings, links, code fences, source claims, and counts.

### Economy and UI Maintenance

- The Python calculator currently awards +1 per eligible conversation and +2 for helpful feedback. Keep RewardGuide, HelpfulFeedback, and service documentation aligned when values change.
- Synchronize level thresholds across Python get_level, TypeScript describeLevel, and SQL xp_level. Database credit uses the delta, never the calculator's stale total.
- UI feedback must reuse the chat request ID on retry. SQL deduplication does not replace server eligibility checks.
- Reuse AccountMenu, AvatarCard, ExpHistory, RewardGuide, and HelpfulFeedback. Card design overrides are decorative; never trust browser prices, XP, ownership, or user IDs for mutations.
- Use useTheme for theme controls and useHomeAccount for session-aware home/account UI. Theme storage is edubuz_theme; it is separate from authentication.

### Existing Commands

Run commands in the named component directory; the current root does not contain an active package.json.

| Directory | Commands | Purpose |
| --- | --- | --- |
| frontend-vite | `npm ci`, `npm run dev` | Install lockfile dependencies; Vite on 5175 |
| frontend-vite | `npm run build`, `npm run lint` | Type/build and lint checks |
| backend-vite | `npm ci`, `npm run dev` | Install; nodemon + ts-node |
| backend-vite | `npm run build`, `npm test` | TypeScript build and Node tests |
| backend-vite | `npm start` | Run previously built dist/server.js |
| reward-gamification-api | `python -m venv .venv-local` | Create local Python environment |
| reward-gamification-api | `.\.venv-local\Scripts\python.exe -m pip install -r requirements.txt` | Install Python dependencies |
| reward-gamification-api | `.\.venv-local\Scripts\python.exe -m uvicorn reward_api:app --host 127.0.0.1 --port 8002` | Run reward API |
| reward-gamification-api | `.\test_reward_api.ps1` | Manual health/reward smoke requests against running service |

start-local.ps1 uses .venv-local and binds 127.0.0.1:8002. Run it from the reward directory after installing requirements. See [current validation](06-PROJECT-TASKS.md#22-current-validation-record) for actual build/lint/test results.

The PowerShell smoke script prints responses and has no assertions; it also omits an authorization header. Adapt an authorized test invocation if reward authentication is enabled. It is not an automated regression suite.

## 21. Rules Change Log

| Date | Rule | Reason |
| --- | --- | --- |
| 2026-09-27 | Added economy RPC, XP/EXP, shared UI/hooks, migration and startup conventions | Match existing implementation |
| 2026-09-26 | Introduced source-based engineering conventions | Preserve service boundaries and existing workspace changes |
| 2026-09-26 | Expanded coding, contract, review, and completion rules | Match complete documentation brief; distinguish proposed conventions from enforced tooling |
