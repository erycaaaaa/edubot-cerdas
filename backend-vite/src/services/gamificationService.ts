import { supabaseAdmin } from './supabaseService';

const DEFAULT_GAMIFICATION_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://127.0.0.1:8002'
    : 'https://edubot-cerdas-production.up.railway.app';

const GAMIFICATION_API_URL = (
  process.env.GAMIFICATION_API_URL?.trim() ||
  DEFAULT_GAMIFICATION_URL
).replace(/\/+$/, '');

const GAMIFICATION_API_KEY =
  process.env.GAMIFICATION_API_KEY?.trim() || '';

const GAMIFICATION_TIMEOUT = Number(process.env.GAMIFICATION_TIMEOUT) || 10000;

// TYPES

export type ModerationLabel =
  | 'NON_TOXIC'
  | 'TOXIC';

export type RewardEvent =
  | 'conversation_completed'
  | 'helpful_feedback'
  | 'challenge_completed'
  | 'learning_milestone'
  | 'safe_interaction';

export type FeedbackType =
  | 'positive'
  | 'negative'
  | 'helpful'
  | 'not_helpful';

export class FeedbackEligibilityError extends Error {}

export interface RewardRequest {
  event: RewardEvent;
  current_xp?: number;
  moderation_label?: ModerationLabel;
  feedback?: FeedbackType;
  request_id?: string;
}

export interface RewardLevel {
  level: number;
  name: string;
  current_xp: number;
  next_level_xp: number | null;
  progress_to_next_level?: number;
}

export interface RewardResponse {
  reward_delta: number;
  new_xp: number;
  level: RewardLevel;
  reason: string;
  safety_gate: 'PASS' | 'BLOCK_REWARD';
  exp_balance?: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  earned: boolean;
}

export interface BadgeRequest {
  conversation_count?: number;
  helpful_feedback_count?: number;
  challenge_count?: number;
  streak_days?: number;
}

export interface BadgeResponse {
  badges: Badge[];
}

export interface StudentGamification {
  studentId: string;
  xp: number;
  level: number;
  updatedAt: string | null;
  expBalance: number;
  avatar: string;
  levelInfo: ReturnType<typeof describeLevel>;
}

// HTTP HELPERS

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (GAMIFICATION_API_KEY) {
    headers.Authorization =
      `Bearer ${GAMIFICATION_API_KEY}`;
  }

  return headers;
}

interface ErrorResponse {
  detail?: unknown;
  message?: unknown;
}

interface HealthResponse {
  status?: unknown;
  service?: unknown;
}

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  const rawText = await response.text();

  let data: unknown = {};

  if (rawText.trim()) {
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(
        `Gamification API returned invalid JSON: ${rawText}`,
      );
    }
  }

  if (!response.ok) {
    let message =
      `Gamification API error: ${response.status}`;

    if (
      typeof data === 'object' &&
      data !== null
    ) {
      const errorData =
        data as ErrorResponse;

      if (
        errorData.detail !== undefined
      ) {
        message =
          String(errorData.detail);
      } else if (
        errorData.message !== undefined
      ) {
        message =
          String(errorData.message);
      }
    }

    throw new Error(message);
  }

  return data as T;
}

// REWARD API

export async function evaluateReward(
  request: RewardRequest,
): Promise<RewardResponse> {
  if (!request.event) {
    throw new Error(
      'Reward event is required',
    );
  }

  if (
    request.event ===
      'helpful_feedback' &&
    !request.feedback
  ) {
    throw new Error(
      'feedback wajib diisi untuk event helpful_feedback',
    );
  }

  let response: Response;

  try {
    response = await fetch(
      `${GAMIFICATION_API_URL}/reward/evaluate`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(GAMIFICATION_TIMEOUT),
        headers: buildHeaders(),
        body: JSON.stringify({
          event:
            request.event,

          current_xp:
            Number(
              request.current_xp ?? 0,
            ),

          moderation_label:
            request.moderation_label,

          feedback:
            request.feedback,

          request_id:
            request.request_id,
        }),
      },
    );
  } catch (error) {
    throw new Error(
      `Gamification API tidak dapat dihubungi: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    );
  }

  return parseResponse<RewardResponse>(
    response,
  );
}

// BADGES

export async function evaluateBadges(
  stats: BadgeRequest,
): Promise<BadgeResponse> {
  let response: Response;

  try {
    response = await fetch(
      `${GAMIFICATION_API_URL}/reward/badges`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(GAMIFICATION_TIMEOUT),
        headers: buildHeaders(),
        body: JSON.stringify({
          conversation_count:
            Number(
              stats.conversation_count ?? 0,
            ),

          helpful_feedback_count:
            Number(
              stats.helpful_feedback_count ?? 0,
            ),

          challenge_count:
            Number(
              stats.challenge_count ?? 0,
            ),

          streak_days:
            Number(
              stats.streak_days ?? 0,
            ),
        }),
      },
    );
  } catch (error) {
    throw new Error(
      `Gamification badge API tidak dapat dihubungi: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    );
  }

  return parseResponse<BadgeResponse>(
    response,
  );
}

// CONVERSATION REWARD

export async function evaluateConversationReward(
  params: {
    currentXp: number;
    moderationLabel: ModerationLabel;
    requestId: string;
  },
): Promise<RewardResponse> {
  return evaluateReward({
    event:
      'conversation_completed',

    current_xp:
      params.currentXp,

    moderation_label:
      params.moderationLabel,

    request_id:
      params.requestId,
  });
}

// GET GAMIFICATION

export function describeLevel(xp: number) {
  const thresholds = [0, 100, 250, 500, 1000];
  const names = ['Learning Explorer', 'Curious Learner', 'Active Learner', 'Problem Solver', 'Learning Champion'];
  const index = thresholds.reduce((found, threshold, i) => xp >= threshold ? i : found, 0);
  const next = thresholds[index + 1] ?? null;
  return { level: index + 1, name: names[index], current_xp: xp, next_level_xp: next,
    progress_to_next_level: next === null ? 1 : (xp - thresholds[index]) / (next - thresholds[index]) };
}

export async function getGamification(studentId: string): Promise<StudentGamification> {
  if (!studentId) throw new Error('studentId wajib diisi');
  const [{ data, error }, profile] = await Promise.all([
    supabaseAdmin.from('student_gamification').select('student_id,xp,level,exp_spent,updated_at').eq('student_id', studentId).maybeSingle(),
    supabaseAdmin.from('profiles').select('avatar').eq('id', studentId).single(),
  ]);
  if (error || profile.error) throw new Error('Failed to get gamification: ' + (error?.message ?? profile.error?.message));
  const xp = Number(data?.xp ?? 0);
  return { studentId, xp, level: Number(data?.level ?? 1), expBalance: xp - Number(data?.exp_spent ?? 0),
    updatedAt: data?.updated_at ?? null, avatar: profile.data?.avatar ?? '🦁', levelInfo: describeLevel(xp) };
}

// PERSIST REWARD

export async function persistReward(
  studentId: string, requestId: string, reward: RewardResponse,
  moderationLabel: ModerationLabel, eventType: RewardEvent = 'conversation_completed',
): Promise<RewardResponse> {
  if (!studentId || !requestId?.trim() || requestId.length > 200) throw new Error('Valid studentId and requestId are required');
  if (!Number.isSafeInteger(reward.reward_delta) || reward.reward_delta < 0) throw new Error('Invalid reward amount');
  // Never write a stale total from the calculator. The DB adds the delta and
  // records the event under the same row lock used by avatar purchases.
  const { data, error } = await supabaseAdmin.rpc('credit_learning_reward', {
    p_user_id: studentId, p_request_id: requestId, p_event: eventType,
    p_delta: reward.reward_delta, p_label: moderationLabel, p_reason: reward.reason,
  });
  if (error) throw new Error('Failed to persist gamification: ' + error.message);
  return { ...reward, reward_delta: data.rewardDelta, new_xp: data.xp,
    level: describeLevel(data.xp), exp_balance: data.expBalance };
}

// PROCESS CONVERSATION REWARD

export async function processConversationReward(
  params: {
    studentId: string;
    requestId: string;
    moderationLabel: ModerationLabel;
  },
): Promise<RewardResponse> {
  const current =
    await getGamification(
      params.studentId,
    );

  const reward =
    await evaluateConversationReward({
      currentXp:
        current.xp,

      moderationLabel:
        params.moderationLabel,

      requestId:
        params.requestId,
    });

  return persistReward(
    params.studentId,
    params.requestId,
    reward,
    params.moderationLabel,
    'conversation_completed',
  );
}

// RECORD FEEDBACK

export async function recordFeedback(
  params: {
    studentId: string;
    requestId: string;
    feedback: FeedbackType;
  },
): Promise<RewardResponse> {
  if (!params.studentId) {
    throw new Error(
      'studentId wajib diisi',
    );
  }

  if (!params.requestId) {
    throw new Error(
      'requestId wajib diisi',
    );
  }

  if (!params.feedback) {
    throw new Error(
      'feedback wajib diisi',
    );
  }

  // Only the owner of a successfully rewarded safe conversation can rate it.
  // A fresh arbitrary ID must never become a source of unlimited XP.
  const { data: conversation, error: conversationError } = await supabaseAdmin
    .from('gamification_events')
    .select('id')
    .eq('student_id', params.studentId)
    .eq('request_id', params.requestId)
    .eq('event_type', 'conversation_completed')
    .eq('moderation_label', 'NON_TOXIC')
    .gt('reward_delta', 0)
    .maybeSingle();
  if (conversationError) throw new Error('Failed to verify feedback eligibility');
  if (!conversation) throw new FeedbackEligibilityError('Feedback hanya tersedia untuk percakapan aman milikmu yang sudah mendapat reward.');

  const current =
    await getGamification(
      params.studentId,
    );

  const reward =
    await evaluateReward({
      event:
        'helpful_feedback',

      current_xp:
        current.xp,

      feedback:
        params.feedback,

      request_id:
        params.requestId,

      /*
       * Feedback sendiri bukan input toxic.
       * Gunakan label netral untuk reward event.
       */
      moderation_label:
        'NON_TOXIC',
    });

  return persistReward(
    params.studentId,
    params.requestId,
    reward,
    'NON_TOXIC',
    'helpful_feedback',
  );
}

// HEALTH CHECK

export async function checkGamificationHealth(): Promise<boolean> {
  try {
    const response =
      await fetch(
        `${GAMIFICATION_API_URL}/health`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(GAMIFICATION_TIMEOUT),
          headers: buildHeaders(),
        },
      );

    if (!response.ok) {
      return false;
    }

    const data: unknown =
      await response.json();

    /*
     * Type guard.
     */
    if (
      typeof data !== 'object' ||
      data === null
    ) {
      return false;
    }

    const health =
      data as HealthResponse;

    return (
      health.status === 'ok'
    );
  } catch {
    return false;
  }
}

// DEFAULT EXPORT

export default {
  evaluateReward,
  evaluateBadges,
  evaluateConversationReward,
  getGamification,
  persistReward,
  processConversationReward,
  recordFeedback,
  checkGamificationHealth,
};
