# EduBuz Backend Diagnostics

This document explains how to run the backend diagnostic checker and how to interpret the results.

## Purpose

The diagnostic script is intentionally read-only. It does not create reward rows, does not modify gamification state, does not bypass moderation, and does not alter authentication or business rules.

It is designed to isolate which integration layer is failing when a conversation is not persisted, XP is not awarded, or feedback is rejected.

## Run the checker

From the backend project folder:

```bash
cd backend-vite
npm run diagnostics
```

Optional arguments:

```bash
npm run diagnostics -- --token "<supabase-access-token>" --request-id "<request-id>"
```

Environment variables the script reads:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MODERATION_API_URL`
- `GENERATOR_API_URL`
- `GAMIFICATION_API_URL`
- `EDUBUZ_DIAGNOSTIC_TOKEN` (optional, for auth validation)
- `EDUBUZ_DIAGNOSTIC_REQUEST_ID` (optional, for reward and feedback checks)

Do not print or expose access tokens in logs or screenshots.

## Expected checks

The script prints a summary with seven categories:

1. Supabase Connectivity
2. Supabase Authentication
3. Moderation API
4. Generator API
5. Reward FastAPI
6. Reward Database
7. Feedback Eligibility

Each result includes:

- Status: PASS / FAIL / UNKNOWN / NOT_TESTED
- HTTP status when applicable
- Response time in milliseconds
- Error category
- Safe error message
- Suggested next action

## Error categories

The checker uses these categories:

- `NETWORK_ERROR`
- `AUTHENTICATION_ERROR`
- `AUTHORIZATION_ERROR`
- `CONFIGURATION_ERROR`
- `TIMEOUT`
- `SERVER_ERROR`
- `DATABASE_ERROR`
- `BUSINESS_RULE_REJECTION`
- `NOT_TESTED`

## How to interpret the result

### Supabase Connectivity

This confirms whether the backend can reach the Supabase REST endpoint.

- PASS means the project URL and outbound connectivity are healthy.
- FAIL usually indicates a URL problem, network issue, blocked egress, or invalid project status.

### Supabase Authentication

This verifies whether a supplied access token is valid.

- Use a real access token from a logged-in user session.
- 401 indicates token invalid, expired, or revoked.
- 403 indicates the token is valid but not allowed for the privileged action.
- If the script reports NOT_TESTED, no access token was provided.

### Moderation API

This sends a harmless educational prompt to the configured moderation endpoint.

- Timeout typically means the moderation service is offline or unreachable.
- 4xx/5xx responses indicate a contract mismatch, service routing issue, or backend dependency failure.

### Generator API

This checks that the text-generation service is reachable and accepts a safe test prompt.

- PASS indicates the model endpoint is reachable.
- FAIL means the URL, network path, service health, or payload contract is likely incorrect.

### Reward FastAPI

This checks the reward service health endpoint.

- If the service is not listening on the configured port, the script will report `ECONNREFUSED` or a similar network failure.
- In a healthy environment this should show PASS.

### Reward Database

This inspects `gamification_events` for a record matching the supplied `requestId`.

Relevant conditions:

- row exists for the same request id
- event type is `conversation_completed`
- `reward_delta > 0`
- moderation label is `NON_TOXIC`

If no record exists, the reward flow most likely stopped before insertion or the request ID mismatched the one used in the sequence.

### Feedback Eligibility

This checks whether a given conversation has a valid reward record that qualifies for helpful feedback.

Feedback should be accepted only when:

- the request ID matches a valid, rewarded conversation
- the conversation is `NON_TOXIC`
- `reward_delta > 0`
- the event is properly stored in the reward table

A rejection at this stage usually means the upstream reward event never existed or the request ID was not preserved correctly.

## Diagnosing common failures

### Authentication failures

Check the following:

- Is the access token expired or invalid?
- Does the request use the correct Supabase project?
- Is the user profile in `profiles` and linked to `auth.users`?
- Are there any token verification 401/403 errors in backend logs?

### Moderation timeouts

Check the following:

- Is the moderation service still running?
- Is the host reachable from the backend environment?
- Are there DNS, ngrok, firewall, or proxy issues?
- Is the endpoint returning a timeout before the request is processed?

### Missing reward records

Check the following:

- Did the chat flow reach the reward step?
- Did the moderation service return a safe result?
- Did the reward FastAPI service respond successfully?
- Did the backend call the correct Supabase RPC or insert the expected event row?
- Does the request ID match the one used in the reward event?

### Feedback rejected despite a result being shown to the student

This usually means one of these is true:

- the conversation was not marked as rewarded in the database
- moderation result was not `NON_TOXIC`
- the database record used a different request ID than the UI used
- the reward delta was zero or missing

## Confirmed findings in the current environment

The checker confirmed the following in the local runtime environment:

- Supabase connectivity is PASS
- Moderation API is PASS
- Generator API is PASS
- Reward FastAPI is FAIL because the local service is not running on the configured port
- Reward database and feedback eligibility are NOT_TESTED without a supplied request ID and valid auth context

This is consistent with a multi-layer integration problem where the reward stack is unavailable even though the upstream Supabase and moderation/generation services are reachable.

## Safety rules

This checker must not:

- create reward records
- change student XP
- mutate `gamification_events`
- bypass moderation
- weaken auth
- disable feedback validation
- print access tokens, secrets, or service role keys

## Related files

- `backend-vite/scripts/edubuz-diagnostics.ts`
- `backend-vite/package.json`
- `backend-vite/src/services/chatService.ts`
- `backend-vite/src/services/gamificationService.ts`
- `backend-vite/src/middleware/auth.ts`
