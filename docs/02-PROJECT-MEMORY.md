# Project Memory

Last inspected: 2026-09-28. Source-based engineering memory; runtime verification remains separate from implementation presence.

## 1. Project Identity

Project: EduBuz (EduBot/Bingo also appear in UI/source). Product: educational chat with moderation, teacher oversight, and rewards. Repository purpose: develop the browser UI, REST orchestration, reward calculator, and database schema. Objective: support learning while handling unsafe interactions explicitly.

Version declarations: backend package 2.0.0; frontend package 0.0.0; reward FastAPI app 1.1.0. There is no verified unified release version. Current development stage: source implementation includes avatar economy and shared account UI, while integration verification and test maintenance remain; an official alpha/beta/production designation is **Unknown / Needs Verification**.

## 2. One-Paragraph Project Summary

EduBuz is a React educational chat application backed by an Express REST API and Supabase Auth/PostgreSQL. Express moderates input, calls an external generator, moderates output, tracks strikes and teacher notifications, and persists rewards calculated by a separate FastAPI service through a transactional SQL RPC. Avatar unlock/equip, EXP history, helpful feedback, account navigation, and shared light/dark theme are implemented. Student and teacher flows have substantial implementation; parent monitoring, recovery, and richer progress displays have gaps. Notes, academic tasks, and calendars are not current implemented modules.

## 3. Current Status

| Area | Status | Notes |
| --- | --- | --- |
| Frontend | Needs Verification | React pages, account/theme UI, avatar collection and progress normalization exist |
| Backend | Needs Verification | REST routes/services exist; local check results are recorded in the task register |
| Authentication | Needs Verification | Teacher self-registration rejected; email recovery and protected role routes implemented; live acceptance pending |
| Database | Needs Verification | Migrations present; live schema/apply history unknown |
| API | Needs Verification | Route inventory verified in source; remote contracts not verified |
| Testing | Needs Verification | Existing tests lag behind moderation/generator and reward RPC contracts |
| Deployment | Needs Verification | No confirmed environment or release pipeline |
| Documentation | Completed | Six living docs, root/component READMEs and avatar guide synchronized on 2026-09-28 |

Completed means the named deliverable exists and was checked at its stated level. In Progress means actively assigned unfinished work; none is evidenced beyond this documentation update. Planned means approved future work; no approved feature roadmap was found. Blocked means a recorded task cannot proceed, not merely that it is incomplete. Proposed follow-ups remain TODO in the task register.

## 4. Completed Tasks

The following are completed source deliverables, not certified end-to-end product features.

- [x] Implement active React route table and entry point.
  - Implementation: RouterProvider mounts routes.ts.
  - Relevant files: [main.tsx](../frontend-vite/src/main.tsx), [routes.ts](../frontend-vite/src/routes.ts).
  - Notes: Source inspected; browser navigation not tested here.
- [x] Implement REST route/controller/service structure.
  - Implementation: auth, chat, own-state, and teacher route modules.
  - Relevant files: [server.ts](../backend-vite/src/server.ts), [teacher routes](../backend-vite/src/routes/teacherRoutes.ts).
  - Notes: Endpoint presence verified; production availability unknown.
- [x] Implement stateless reward and badge calculation endpoints.
  - Implementation: Pydantic requests and Python evaluation functions.
  - Relevant files: [reward_api.py](../reward-gamification-api/reward_api.py).
  - Notes: Does not establish reliable persistence or complete challenge workflows.
- [x] Establish living documentation.
  - Implementation: six docs and root README documentation index.
  - Relevant files: [architecture](01-SYSTEM-ARCHITECTURE.md), [task register](06-PROJECT-TASKS.md), [README](../README.md).
  - Notes: Documentation-only change; local build/lint/backend test results are recorded in the task register. Live integration and browser checks were not run.

### Source additions confirmed on 2026-09-27

- Avatar overview and full collection routes, reusable cards, latest 30 EXP transactions in WIB, and reward guide.
- Eight free starter avatars and three paid seed avatars; unlock and equip are separate actions.
- Atomic credit_learning_reward/unlock_avatar RPCs and ownership-checked equip_avatar; protected profile fields and server-only economy writes.
- Conversation reward is now +1 XP, helpful feedback +2 XP. Spending EXP preserves lifetime XP and level.
- GET/chat levelInfo normalization and available EXP; no current percentage progress bar in StudentChat.
- Native account dialog, logout with error handling, session-aware home navigation, and saved light/dark theme shared across tabs.

Source review does not prove deployed migrations or complete product acceptance. See [validation](06-PROJECT-TASKS.md#22-current-validation-record).

## 5. In Progress

No active application assignment is confirmed. The following unfinished integrations are observed, but should not be interpreted as evidence that someone is currently working on them.

- [ ] Complete reliable progress integration.
  - Current state: Migration 004 aligns labels and uses atomic reward credit; GET/chat normalization carries levelInfo and EXP. Deployed schema and end-to-end persistence remain unverified.
  - Relevant files: gamificationService.ts, chatService.ts, apiClient.ts, StudentChat.tsx, migration 003.
  - Remaining work: verify migration application, persistence/retries/concurrency, and exercise the new database test harness.
  - Blocker: applied schema unknown; inspection/reproduction can proceed.
- [ ] Resolve recovery and parent-monitoring scope.
  - Current state: recovery now uses Supabase email links and a reset page; parent monitoring remains static UI.
  - Relevant files: ForgotPassword.tsx, authStore.ts, ParentDashboard.tsx.
  - Remaining work: define supported behavior and implement/test chosen scope.
  - Blocker: product decisions for full integration; no owner recorded.

## 6. Planned

No approved future feature plan is recorded. [Tasks](06-PROJECT-TASKS.md) proposes contract, authorization, persistence, and UX work. Notes, academic task management, and global search are FUTURE / Proposed decision items, not an adopted architecture or implemented MVP.

## 7. Blockers

| Problem | Impact | Possible solution | Owner | Status |
| --- | --- | --- | --- | --- |
| Applied Supabase schema unknown | Cannot certify RLS, constraints, or upgrades | Inspect authorized disposable/deployed schema and migration history | Unassigned | Needs Verification |
| External model servers absent from repository | Cannot verify deployed model behavior from local source | Obtain service contract and authorized test environment | Unassigned | Needs Verification |
| Admin rollout and legacy school review | Real invite/email and institution mapping are unverified | Apply 007, create first admin and verify email/school scope | Unassigned | Needs Verification |

These are verification limitations, not fabricated BLOCKED task assignments. Earlier documentation-only updates did not change application source; the admin implementation below does. Source inspected on 2026-09-28 now includes administrator-only teacher enrollment, student role enforcement, email recovery, feedback ownership checks, migrations 005/006, and local regression suites.

## 8. Important Technical Decisions

| Topic | Verified context | Evidence |
| --- | --- | --- |
| Product | Educational AI chat, strikes, teacher oversight, rewards | frontend pages; backend services |
| Naming | EduBuz, EduBot, and Bingo coexist | package names, response text, components |
| Active UI | main.tsx -> routes.ts -> RouterProvider | [entry](../frontend-vite/src/main.tsx) |
| Inactive alternative | App.tsx has different routes | [App](../frontend-vite/src/App.tsx) |
| Backend | REST Express, default port 5000 | [server](../backend-vite/src/server.ts) |
| Frontend port | 5175, strictPort | [Vite config](../frontend-vite/vite.config.ts) |
| Reward process | FastAPI, default 8002, stateless | [Python source](../reward-gamification-api/reward_api.py) |
| State authority | Supabase profiles/progress/events; browser metadata is a cache | services and migrations |
| School grouping | profiles.school_id TEXT FK -> schools.id; old groups preserved, new users unassigned | migration 007 |

### Decision: Preserve Safety Branches

Reason: chatService explicitly separates toxic input from outages and generated output.

Do Not: infer a student violation solely from an unavailable moderation service or rejected model output.

- A moderation outage must not add a student strike or continue to the generator.
- Confirmed toxic input can add strikes; toxic generated output must not add student strikes.
- Three strikes block the account; teacher resets are school-scoped and audited.
- Toxic reward evaluation returns zero additional XP, not an XP deduction.
- Reward calculations are stateless. Persistence belongs to Express/Supabase.
- Teacher access and browser session metadata must not substitute for backend authorization.

These behaviors are visible in source, but full runtime verification is pending.

### Decision: Preserve Service Boundaries

Reason: reward service is stateless by implementation; Express owns authenticated database mutations.

Do Not: put privileged Supabase keys in browser code or treat a calculator request_id echo as durable idempotency. Historical alternatives considered are **Unknown / Needs Verification**.

## 9. Important Project Constraints

React/TypeScript is the active frontend; Express/TypeScript is the API; Python is the reward service. REST and existing folders are the baseline. CORS defaults to local port 5175 origins and supports CORS_ORIGINS. Browser chat waits 190 seconds while generator timeout alone can reach 180 seconds; overall latency guarantees are unverified. Migrations and service contracts must change together. Secrets must not enter documentation. Runtime versions, hosting constraints, and performance SLOs are unknown.

## 10. Current API Contracts

See the [full API inventory](01-SYSTEM-ARCHITECTURE.md#10-api-architecture).

| Boundary | Current contract | Caution |
| --- | --- | --- |
| POST /api/auth/login | email/password -> user plus session tokens | Browser must establish Supabase session |
| POST /api/chat | message, optional requestId -> success/data | Inspect data.status even for HTTP 200 |
| GET /api/me/gamification | success/data with xp, numeric level, levelInfo, expBalance, avatar | Browser normalizes nested level; statistics still default to zero/empty |
| POST /api/me/gamification/feedback | helpful or not_helpful, required requestId | Owned, rewarded NON_TOXIC conversation required; SQL replay deduplication |
| GET /api/me/avatars; POST unlock/equip | Authenticated collection/history and SQL transactions | Prices/ownership/balance come from the server |
| Teacher routes | Supabase bearer + teacher role | Queries must remain school-scoped |
| POST /reward/evaluate | snake_case request -> reward_delta/new_xp/level | Optional bearer key; no persistence |

## 11. Current Database State

Migrations define profiles linked to auth.users, violations, teacher_notifications, strike_resets, student_gamification, gamification_events, avatar_catalog, and user_avatars. Migration 004 adds exp_spent, equipped_avatar_id, event exp_after/avatar_id, atomic economy RPCs, grants, and a protected-profile trigger. student_id/teacher_id relationships refer to profiles; school_id is a nullable TEXT foreign key to schools.id after 007. No notes/tasks/chat-history tables are defined. See [schema evidence and ER diagram](01-SYSTEM-ARCHITECTURE.md#8-database-architecture). Apply 001, 002, nested 003, 004, 005, 006, then 007 using supabase/migrations.json. Actual effective RLS and applied constraints remain unknown.

## 12. Authentication State

Update (2026-09-26): password login now uses a fresh createLoginClient() rather than signing in on supabaseAdmin. The shared admin client must never acquire a user session. This fixes the reproduced post-login RLS failure when persisting XP.

Backend registration creates student/parent profiles with no school assignment and rejects public teacher/admin enrollment. The admin dashboard invites teachers into explicitly selected schools. Backend login returns access/refresh tokens; browser authStore calls setSession and stores local UI metadata. requireAuth verifies bearer identity and profile, including blocked state. Teacher endpoints add requireRole('teacher'); /api/me and chat enforce the student role. Active lazy routes use role-specific ProtectedRoute wrappers and GET /api/auth/me. Local metadata is not authentication. Password recovery uses Supabase email links and /reset-password; live email/browser acceptance remains unverified.

## 13. Known Bugs

| Finding | Current status | Follow-up |
| --- | --- | --- |
| Old SAFE/UNSAFE event constraint | Addressed by migration 004 conversion/replacement; databases at 003 remain incompatible | DATA-01 / DB-01: verify upgrade |
| Reward total written before duplicate detection | Replaced with locked credit_learning_reward RPC; verify real PostgreSQL replay/concurrency | DATA-02 |
| Incomplete GET/chat level metadata | levelInfo and normalization implemented; counters/streaks/badges remain placeholders | API-01 / REWARD-02 |
| Fraction interpreted as percentage | Old display is no longer in StudentChat; fraction contract remains 0..1 for future consumers | API-01 |
| Shared admin login contamination | Fresh login client remains implemented; RPC/profile regression fixtures updated; 16 backend tests pass on 2026-09-28 | AUTH-05 / TEST-01 |
| Feedback eligibility | Endpoint requires an owned rewarded safe conversation; arbitrary/foreign IDs are rejected and replay is deduplicated | REWARD-01 |
| Logged-out password recovery | Email-link and reset pages implemented; Supabase delivery/redirect/browser verification remains | AUTH-03 |
| Strike/reset multi-write flow | Migration 006 implements transactional strike/reset and student-scoped request IDs; database execution remains unverified in this pass | DATA-03 |

Parent data is still static. Nested migration 003 is listed in migrations.json; reward .env.example and a top-level version snapshot now exist. Clean-install verification remains a setup limitation, not new feature implementations. Current test results and historical results are kept separate in the task register.

## 14. Known Technical Debt

Separate from the concrete bugs above: inactive App.tsx route tree; legacy auth helpers; large page modules and repeated inline UI; leftover dependency declarations; broad Python dependency declarations with a pinned top-level snapshot; nested/overlapping migrations; incomplete integration and security coverage. See [architecture debt](01-SYSTEM-ARCHITECTURE.md#17-known-technical-debt).

## 15. Important Files

| File | Purpose | Importance |
| --- | --- | --- |
| [routes.ts](../frontend-vite/src/routes.ts) | Active route map | Check before navigation edits |
| [apiClient.ts](../frontend-vite/src/services/apiClient.ts) | Browser API types and helpers | Contract boundary |
| [authStore.ts](../frontend-vite/src/store/authStore.ts) | Session/login utilities | Auth boundary |
| [server.ts](../backend-vite/src/server.ts) | Route mounts and runtime setup | API entry |
| [auth.ts](../backend-vite/src/middleware/auth.ts) | Bearer and role verification | Access boundary |
| [chatService.ts](../backend-vite/src/services/chatService.ts) | Moderation and generation orchestration | Safety behavior |
| [strikeService.ts](../backend-vite/src/services/strikeService.ts) | Strikes and reset audit | Data integrity |
| [gamificationService.ts](../backend-vite/src/services/gamificationService.ts) | Reward persistence | Contract/retry fixes |
| [reward_api.py](../reward-gamification-api/reward_api.py) | Reward rules | Cross-language contract |
| [avatar service](../backend-vite/src/services/avatarService.ts) | Catalog, ownership and history; unlock/equip RPCs | Server economy boundary |
| [migration 004](../supabase/migrations/004_avatar_economy.sql) | Atomic XP/EXP, ownership, grants and label upgrade | Required by current backend |
| [avatar card configuration](../frontend-vite/src/config/avatarCards.ts) | Decorative illustration/name/rarity overrides | Does not set prices or permissions |
| [migration 003](../supabase/migrations/supabase/migrations/003_profile_gamification.sql) | Progress/event schema | Applied state must be checked |

## 16. AI Agent Context

### Before Changing Code

1. Read this memory.
2. Read [architecture](01-SYSTEM-ARCHITECTURE.md).
3. Read [development rules](04-DEVELOPMENT-RULES.md).
4. Inspect relevant source files and current git status.
5. Avoid unrelated changes; use PRD/design/tasks when relevant.

### Before Creating New Files

Check existing components/services/helpers for reuse. File names in an IDE tab do not establish on-disk existence.

### Before Changing APIs

Compare browser types, controllers, services, Python models, and actual response/error envelopes.

### Before Changing Database

Inspect all schema/migrations, including nested 003, and verify current applied state before choosing an upgrade path.

Git status already contained deletions of a root Svelte scaffold and untracked application directories before documentation was created. Those changes belong to the existing workspace. Do not restore, stage, or remove them as incidental cleanup. The later admin implementation changes source/migration files as listed in 07-ADMIN-SETUP.md; unrelated scaffold changes remain untouched.

## 17. Recent Changes

Admin implementation, 2026-09-28: schools/FK migration 007, shared admin login and protected dashboard, school management, teacher invitation/transfer/disable, password activation and transactional administrative audit are implemented. Public role and school assignment remain server-controlled. Local backend suite now has 21 passing tests; disposable PostgreSQL and fixture browser checks pass. No live Supabase mutation or email was sent. [Setup and implementation report](07-ADMIN-SETUP.md).


2026-09-28: documented lazy protected routes and /api/auth/me, email recovery, administrator-only teacher enrollment, student-only API access, owned-conversation feedback, migration manifest and migrations 005/006, CORS_ORIGINS and the Python dependency snapshot. Both builds and frontend lint pass; backend 16/16 and Python 5/5 tests pass. Docker database tests, live services and browser/email verification were not run. Frontend retains a 524.59 kB chunk warning.

| Date | Change | Verification scope |
| --- | --- | --- |
| 2026-09-26 | Created initial six-document baseline | Source and documentation inspection |
| 2026-09-26 | Expanded all documents to the complete requested structure and added README reading index | Documentation structure, links, and task counts; no app changes |

2026-09-27: synchronized all documentation with avatar economy, helpful feedback, +1 chat rewards, account/theme UI, and current validation. Old source defects addressed by 004 now require deployment verification rather than a second implementation.

Earlier development chronology and approvals are **Unknown / Needs Verification**.

Historical record, 2026-09-26 (before avatar RPC changes): fixed shared Supabase session contamination during login. Backend build and 2/2 regression scenarios pass, including ten safe rewards -> 100 XP/level 2 and concurrent user logins. Full test suite: 4 pass, 2 older moderation/generator contract failures. Tests use local HTTP stubs with the real SDK; no live data was changed.

## 18. Current Next Step

Verify migration history and apply order in an authorized test database: 001 -> 002 -> nested 003 -> 004 -> 005 -> 006 -> 007. The current backend requires exp_spent and the economy RPCs. Then exercise reward replay, concurrent earning/spending, insufficient EXP, repeat unlock, unowned equip, protected profile writes, and refresh persistence.

Backend stubs now cover RPC persistence, current moderation/generator contracts, feedback ownership, role boundaries and school scoping. Verify live recovery and administrator teacher provisioning; retain browser/database acceptance work. No production migration or missed-reward backfill was performed in this documentation pass.

## 19. Memory Update Rules

Update after significant implementation, API/schema changes, verified bug discovery/fix, scope decisions, blockers, and test/deployment outcomes. Record evidence and dates; distinguish implemented source from runtime verification. Do not erase unresolved mismatches or mark proposed work completed. Never store credentials, access tokens, passwords, or personal account data.

> This file is the project's persistent engineering memory. Future contributors and AI agents should read it before making significant changes.
