import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

type DiagnosticStatus = 'PASS' | 'FAIL' | 'UNKNOWN' | 'NOT_TESTED';
type ErrorCategory =
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'DATABASE_ERROR'
  | 'BUSINESS_RULE_REJECTION'
  | 'NOT_TESTED';

interface DiagnosticResult {
  status: DiagnosticStatus;
  category: ErrorCategory;
  httpStatus?: number;
  responseTimeMs?: number;
  message: string;
  suggestion: string;
}

interface ParsedArgs {
  requestId?: string;
  token?: string;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const result: ParsedArgs = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--request-id' || arg === '--requestId') {
      result.requestId = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--token' || arg === '--access-token') {
      result.token = args[index + 1];
      index += 1;
    }
  }

  result.requestId ??= process.env.EDUBUZ_DIAGNOSTIC_REQUEST_ID;
  result.token ??= process.env.EDUBUZ_DIAGNOSTIC_TOKEN ?? process.env.EDUBUZ_TEST_ACCESS_TOKEN;

  return result;
}

function redactUrl(value?: string): string {
  if (!value) return 'not configured';

  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return 'invalid-url';
  }
}

function getAxiosErrorCategory(error: AxiosError): ErrorCategory {
  if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
    return 'TIMEOUT';
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
    return 'NETWORK_ERROR';
  }

  if (error.response?.status === 401) {
    return 'AUTHENTICATION_ERROR';
  }

  if (error.response?.status === 403) {
    return 'AUTHORIZATION_ERROR';
  }

  if (error.response && error.response.status >= 500) {
    return 'SERVER_ERROR';
  }

  if (error.response && error.response.status >= 400) {
    return 'SERVER_ERROR';
  }

  return 'NETWORK_ERROR';
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data && typeof error.response.data === 'object'
      ? JSON.stringify(error.response.data).slice(0, 220)
      : error.message;
    return message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

async function loadSupabaseAdmin(): Promise<{
  createClient: typeof import('@supabase/supabase-js').createClient;
}> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.');
  }

  const supabaseMod = await import('@supabase/supabase-js');
  return { createClient: supabaseMod.createClient };
}

async function checkSupabaseConnectivity(): Promise<DiagnosticResult> {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    return {
      status: 'FAIL',
      category: 'CONFIGURATION_ERROR',
      message: 'Supabase URL or service role key is not configured.',
      suggestion: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running diagnostics.',
    };
  }

  const started = Date.now();

  try {
    const response = await axios.get(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      validateStatus: () => true,
      timeout: 15000,
    });

    const elapsed = Date.now() - started;

    if (response.status >= 200 && response.status < 400) {
      return {
        status: 'PASS',
        category: 'NOT_TESTED',
        httpStatus: response.status,
        responseTimeMs: elapsed,
        message: 'Supabase REST endpoint is reachable.',
        suggestion: 'Connectivity is working; continue with auth and service diagnostics.',
      };
    }

    return {
      status: 'FAIL',
      category: response.status === 401 ? 'AUTHENTICATION_ERROR' : 'SERVER_ERROR',
      httpStatus: response.status,
      responseTimeMs: elapsed,
      message: `Supabase REST endpoint returned an unexpected HTTP status (${response.status}).`,
      suggestion: 'Verify the Supabase project URL, service role key, and project status.',
    };
  } catch (error) {
    const elapsed = Date.now() - started;

    if (axios.isAxiosError(error)) {
      const category = getAxiosErrorCategory(error);
      return {
        status: 'FAIL',
        category,
        httpStatus: error.response?.status,
        responseTimeMs: elapsed,
        message: category === 'TIMEOUT' ? 'Supabase network request timed out.' : getErrorMessage(error),
        suggestion: category === 'TIMEOUT'
          ? 'Check Supabase network reachability and whether the project is temporarily unavailable.'
          : 'Validate the Supabase URL and confirm the backend can reach the Supabase region.',
      };
    }

    return {
      status: 'FAIL',
      category: 'NETWORK_ERROR',
      responseTimeMs: elapsed,
      message: getErrorMessage(error),
      suggestion: 'Check outbound connectivity to the Supabase endpoint.',
    };
  }
}

async function checkSupabaseAuth(token?: string): Promise<DiagnosticResult> {
  if (!token) {
    return {
      status: 'NOT_TESTED',
      category: 'NOT_TESTED',
      message: 'No test access token was provided.',
      suggestion: 'Set EDUBUZ_DIAGNOSTIC_TOKEN or --token to verify the auth flow.',
    };
  }

  const started = Date.now();

  try {
    const { createClient } = await loadSupabaseAdmin();
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error } = await client.auth.getUser(token);
    const elapsed = Date.now() - started;

    if (error || !data.user) {
      const category = error?.status === 401 ? 'AUTHENTICATION_ERROR'
        : error?.status === 403 ? 'AUTHORIZATION_ERROR'
        : 'SERVER_ERROR';

      return {
        status: 'FAIL',
        category,
        httpStatus: error?.status,
        responseTimeMs: elapsed,
        message: error?.message ?? 'Token validation failed without a detailed error.',
        suggestion: category === 'AUTHENTICATION_ERROR'
          ? 'Verify the token is a valid Supabase access token and not expired or revoked.'
          : 'Check whether the user profile is valid and whether the token has the required role permissions.',
      };
    }

    return {
      status: 'PASS',
      category: 'NOT_TESTED',
      httpStatus: 200,
      responseTimeMs: elapsed,
      message: 'Supabase token was accepted and the user profile is valid.',
      suggestion: 'Authentication is healthy; continue debugging the moderation and reward integrations.',
    };
  } catch (error) {
    const elapsed = Date.now() - started;

    if (axios.isAxiosError(error)) {
      const category = getAxiosErrorCategory(error);
      return {
        status: 'FAIL',
        category,
        httpStatus: error.response?.status,
        responseTimeMs: elapsed,
        message: getErrorMessage(error),
        suggestion: 'Check whether the Supabase auth endpoint is reachable and whether the token is valid.',
      };
    }

    return {
      status: 'FAIL',
      category: 'NETWORK_ERROR',
      responseTimeMs: elapsed,
      message: getErrorMessage(error),
      suggestion: 'Inspect Supabase connectivity and token validity before retrying the auth flow.',
    };
  }
}

async function checkModerationApi(): Promise<DiagnosticResult> {
  const url = process.env.MODERATION_API_URL?.trim();

  if (!url) {
    return {
      status: 'FAIL',
      category: 'CONFIGURATION_ERROR',
      message: 'MODERATION_API_URL is not configured.',
      suggestion: 'Set MODERATION_API_URL in the backend environment before testing moderation.',
    };
  }

  const started = Date.now();

  try {
    const response = await axios.post(
      `${url.replace(/\/+$/, '')}/moderate`,
      {
        text: 'Diagnostic safe prompt: explain a simple science concept in one sentence.',
        request_id: 'edubuz-diagnostic-moderation',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        timeout: Number(process.env.MODERATION_TIMEOUT || 30000),
        validateStatus: () => true,
      },
    );

    const elapsed = Date.now() - started;

    if (response.status >= 200 && response.status < 400) {
      return {
        status: 'PASS',
        category: 'NOT_TESTED',
        httpStatus: response.status,
        responseTimeMs: elapsed,
        message: 'Moderation API accepted a harmless test payload.',
        suggestion: 'The moderation service is reachable; if chat still fails, inspect the request/response contract and moderation model availability.',
      };
    }

    return {
      status: 'FAIL',
      category: response.status === 401 ? 'AUTHENTICATION_ERROR' : response.status === 403 ? 'AUTHORIZATION_ERROR' : 'SERVER_ERROR',
      httpStatus: response.status,
      responseTimeMs: elapsed,
      message: `Moderation API responded with HTTP ${response.status}.`,
      suggestion: 'Check the moderation endpoint health, required headers, and upstream service availability.',
    };
  } catch (error) {
    const elapsed = Date.now() - started;

    if (axios.isAxiosError(error)) {
      const category = getAxiosErrorCategory(error);
      return {
        status: 'FAIL',
        category,
        httpStatus: error.response?.status,
        responseTimeMs: elapsed,
        message: category === 'TIMEOUT' ? 'Moderation API timeout exceeded.' : getErrorMessage(error),
        suggestion: category === 'TIMEOUT'
          ? 'Confirm that the moderation service is running and reachable from the backend environment.'
          : 'Inspect the moderation endpoint and network path, including ngrok or reverse-proxy health.',
      };
    }

    return {
      status: 'FAIL',
      category: 'NETWORK_ERROR',
      responseTimeMs: elapsed,
      message: getErrorMessage(error),
      suggestion: 'Check the moderation service container, process, and outbound connectivity.',
    };
  }
}

async function checkGeneratorApi(): Promise<DiagnosticResult> {
  const url = process.env.GENERATOR_API_URL?.trim();

  if (!url) {
    return {
      status: 'FAIL',
      category: 'CONFIGURATION_ERROR',
      message: 'GENERATOR_API_URL is not configured.',
      suggestion: 'Set GENERATOR_API_URL in the backend environment before checking generator availability.',
    };
  }

  const started = Date.now();

  try {
    const response = await axios.post(
      `${url.replace(/\/+$/, '')}/generate`,
      {
        prompt: 'Give a safe educational response in one sentence.',
        max_new_tokens: 32,
        do_sample: false,
        request_id: 'edubuz-diagnostic-generator',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        timeout: Number(process.env.GENERATOR_TIMEOUT || 180000),
        validateStatus: () => true,
      },
    );

    const elapsed = Date.now() - started;

    if (response.status >= 200 && response.status < 400) {
      return {
        status: 'PASS',
        category: 'NOT_TESTED',
        httpStatus: response.status,
        responseTimeMs: elapsed,
        message: 'Generator API accepted a harmless test prompt.',
        suggestion: 'Generator reachability is healthy; if chat still fails, review the response contract and model readiness.',
      };
    }

    return {
      status: 'FAIL',
      category: response.status === 401 ? 'AUTHENTICATION_ERROR' : response.status === 403 ? 'AUTHORIZATION_ERROR' : 'SERVER_ERROR',
      httpStatus: response.status,
      responseTimeMs: elapsed,
      message: `Generator API responded with HTTP ${response.status}.`,
      suggestion: 'Verify the generator service is running and that the request payload matches the service contract.',
    };
  } catch (error) {
    const elapsed = Date.now() - started;

    if (axios.isAxiosError(error)) {
      const category = getAxiosErrorCategory(error);
      return {
        status: 'FAIL',
        category,
        httpStatus: error.response?.status,
        responseTimeMs: elapsed,
        message: category === 'TIMEOUT' ? 'Generator API timeout exceeded.' : getErrorMessage(error),
        suggestion: category === 'TIMEOUT'
          ? 'Check generator service health and ensure the backend can reach the hosted model endpoint.'
          : 'Inspect the generator service URL and its request schema.',
      };
    }

    return {
      status: 'FAIL',
      category: 'NETWORK_ERROR',
      responseTimeMs: elapsed,
      message: getErrorMessage(error),
      suggestion: 'Validate generator connectivity and process health before retrying chat generation.',
    };
  }
}

async function checkRewardFastApi(): Promise<DiagnosticResult> {
  const url = process.env.GAMIFICATION_API_URL?.trim();

  if (!url) {
    return {
      status: 'FAIL',
      category: 'CONFIGURATION_ERROR',
      message: 'GAMIFICATION_API_URL is not configured.',
      suggestion: 'Set GAMIFICATION_API_URL in the backend environment for the reward service.',
    };
  }

  const started = Date.now();

  try {
    const response = await axios.get(`${url.replace(/\/+$/, '')}/health`, {
      timeout: Number(process.env.GAMIFICATION_TIMEOUT || 10000),
      validateStatus: () => true,
    });

    const elapsed = Date.now() - started;

    if (response.status >= 200 && response.status < 400) {
      return {
        status: 'PASS',
        category: 'NOT_TESTED',
        httpStatus: response.status,
        responseTimeMs: elapsed,
        message: 'Reward FastAPI health endpoint is responding.',
        suggestion: 'The reward service is reachable; next inspect whether the DB RPC records reward events.',
      };
    }

    return {
      status: 'FAIL',
      category: response.status === 401 ? 'AUTHENTICATION_ERROR' : response.status === 403 ? 'AUTHORIZATION_ERROR' : 'SERVER_ERROR',
      httpStatus: response.status,
      responseTimeMs: elapsed,
      message: `Reward FastAPI returned HTTP ${response.status}.`,
      suggestion: 'Check the reward API process, configured port, and required auth headers.',
    };
  } catch (error) {
    const elapsed = Date.now() - started;

    if (axios.isAxiosError(error)) {
      const category = getAxiosErrorCategory(error);
      return {
        status: 'FAIL',
        category,
        httpStatus: error.response?.status,
        responseTimeMs: elapsed,
        message: category === 'TIMEOUT' ? 'Reward FastAPI health check timed out.' : getErrorMessage(error),
        suggestion: category === 'TIMEOUT'
          ? 'Start the reward API or verify host and port connectivity before relying on XP rewards.'
          : 'Validate the reward service URL and ensure the process is running on the expected port.',
      };
    }

    return {
      status: 'FAIL',
      category: 'NETWORK_ERROR',
      responseTimeMs: elapsed,
      message: getErrorMessage(error),
      suggestion: 'Verify the reward service is active and reachable from the backend environment.',
    };
  }
}

async function checkRewardDatabase(requestId?: string): Promise<DiagnosticResult> {
  if (!requestId) {
    return {
      status: 'NOT_TESTED',
      category: 'NOT_TESTED',
      message: 'No requestId supplied to inspect gamification_events.',
      suggestion: 'Pass --request-id or set EDUBUZ_DIAGNOSTIC_REQUEST_ID to inspect a specific chat reward event.',
    };
  }

  try {
    const { createClient } = await loadSupabaseAdmin();
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error } = await client
      .from('gamification_events')
      .select('id, student_id, request_id, event_type, reward_delta, moderation_label, reason, created_at')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return {
        status: 'FAIL',
        category: 'DATABASE_ERROR',
        message: error.message,
        suggestion: 'Check whether the gamification_events table exists and whether the request_id column is populated as expected.',
      };
    }

    if (!data || data.length === 0) {
      return {
        status: 'FAIL',
        category: 'BUSINESS_RULE_REJECTION',
        message: `No gamification_events rows were found for requestId ${requestId}.`,
        suggestion: 'Verify that the chat flow reached the reward step and that the database transaction successfully inserted a conversation_completed event.',
      };
    }

    const validRecord = data.find((row) => row.event_type === 'conversation_completed' && Number(row.reward_delta ?? 0) > 0 && row.moderation_label === 'NON_TOXIC');

    if (validRecord) {
      return {
        status: 'PASS',
        category: 'NOT_TESTED',
        message: `A valid reward event exists for requestId ${requestId}.`,
        suggestion: 'The reward database has a valid conversation_completed record; focus on the auth/moderation outer layers if the user still reports missing XP.',
      };
    }

    return {
      status: 'FAIL',
      category: 'BUSINESS_RULE_REJECTION',
      message: `The requestId exists but does not contain a valid conversation_completed reward record with reward_delta > 0.`,
      suggestion: 'Inspect whether moderation flagged the chat as toxic or whether the reward pipeline stopped before persisting the event.',
    };
  } catch (error) {
    return {
      status: 'FAIL',
      category: 'DATABASE_ERROR',
      message: getErrorMessage(error),
      suggestion: 'Verify DB connectivity, RLS access, and the shape of the gamification_events table.',
    };
  }
}

async function checkFeedbackEligibility(requestId?: string): Promise<DiagnosticResult> {
  if (!requestId) {
    return {
      status: 'NOT_TESTED',
      category: 'NOT_TESTED',
      message: 'No requestId supplied for feedback eligibility checks.',
      suggestion: 'Pass --request-id or set EDUBUZ_DIAGNOSTIC_REQUEST_ID to inspect whether a chat qualifies for feedback.',
    };
  }

  try {
    const { createClient } = await loadSupabaseAdmin();
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error } = await client
      .from('gamification_events')
      .select('id, student_id, request_id, event_type, reward_delta, moderation_label, created_at')
      .eq('request_id', requestId)
      .eq('event_type', 'conversation_completed')
      .eq('moderation_label', 'NON_TOXIC')
      .gt('reward_delta', 0)
      .limit(10);

    if (error) {
      return {
        status: 'FAIL',
        category: 'DATABASE_ERROR',
        message: error.message,
        suggestion: 'Inspect the reward database schema and the gamification_events contract used by the feedback validator.',
      };
    }

    if (!data || data.length === 0) {
      return {
        status: 'FAIL',
        category: 'BUSINESS_RULE_REJECTION',
        message: 'The conversation does not have a valid rewarded NON_TOXIC record, so feedback should be rejected.',
        suggestion: 'Confirm the chat reached the successful reward step and that the request_id matches the rewarded conversation record exactly.',
      };
    }

    return {
      status: 'PASS',
      category: 'NOT_TESTED',
      message: `The specified requestId qualifies for feedback because a rewarded conversation record was found.`,
      suggestion: 'Feedback eligibility is satisfied; if user feedback still fails, inspect the request ID used by the client after the reward event was created.',
    };
  } catch (error) {
    return {
      status: 'FAIL',
      category: 'DATABASE_ERROR',
      message: getErrorMessage(error),
      suggestion: 'Verify database connectivity and the correct permission model for read-only reward checks.',
    };
  }
}

function printDiagnosticResult(label: string, result: DiagnosticResult): void {
  const statusLine = `${label}: ${result.status}`;
  console.log(statusLine);
  console.log(`  Status: ${result.status}`);
  if (typeof result.httpStatus === 'number') console.log(`  HTTP Status: ${result.httpStatus}`);
  if (typeof result.responseTimeMs === 'number') console.log(`  Response Time: ${result.responseTimeMs} ms`);
  console.log(`  Error Category: ${result.category}`);
  console.log(`  Safe Error Message: ${result.message}`);
  console.log(`  Suggested Next Action: ${result.suggestion}`);
  console.log('');
}

async function main(): Promise<void> {
  const args = parseArgs();

  const supabaseConnectivity = await checkSupabaseConnectivity();
  const supabaseAuth = await checkSupabaseAuth(args.token);
  const moderationApi = await checkModerationApi();
  const generatorApi = await checkGeneratorApi();
  const rewardFastApi = await checkRewardFastApi();
  const rewardDatabase = await checkRewardDatabase(args.requestId);
  const feedbackEligibility = await checkFeedbackEligibility(args.requestId);

  console.log('EDUBUZ BACKEND DIAGNOSTICS');
  console.log('');
  console.log('1. Supabase Connectivity: ' + supabaseConnectivity.status);
  printDiagnosticResult('Supabase Connectivity', supabaseConnectivity);
  console.log('2. Supabase Authentication: ' + supabaseAuth.status);
  printDiagnosticResult('Supabase Authentication', supabaseAuth);
  console.log('3. Moderation API: ' + moderationApi.status);
  printDiagnosticResult('Moderation API', moderationApi);
  console.log('4. Generator API: ' + generatorApi.status);
  printDiagnosticResult('Generator API', generatorApi);
  console.log('5. Reward FastAPI: ' + rewardFastApi.status);
  printDiagnosticResult('Reward FastAPI', rewardFastApi);
  console.log('6. Reward Database: ' + rewardDatabase.status);
  printDiagnosticResult('Reward Database', rewardDatabase);
  console.log('7. Feedback Eligibility: ' + feedbackEligibility.status);
  printDiagnosticResult('Feedback Eligibility', feedbackEligibility);

  console.log('Diagnostic environment summary:');
  console.log(`  Supabase URL: ${redactUrl(process.env.SUPABASE_URL)}`);
  console.log(`  Moderation API URL: ${redactUrl(process.env.MODERATION_API_URL)}`);
  console.log(`  Generator API URL: ${redactUrl(process.env.GENERATOR_API_URL)}`);
  console.log(`  Reward API URL: ${redactUrl(process.env.GAMIFICATION_API_URL)}`);
  console.log(`  Request ID inspected: ${args.requestId ?? 'not supplied'}`);
}

main().catch((error) => {
  console.error('EDUBUZ BACKEND DIAGNOSTICS FAILED UNEXPECTEDLY');
  console.error('Category: CONFIGURATION_ERROR');
  console.error(`Safe Error Message: ${getErrorMessage(error)}`);
  console.error('Suggested Next Action: Verify the backend environment and ensure the diagnostic runner is executed inside the backend project context.');
  process.exitCode = 1;
});
