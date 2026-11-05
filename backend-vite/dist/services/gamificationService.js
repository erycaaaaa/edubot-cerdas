"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackEligibilityError = void 0;
exports.evaluateReward = evaluateReward;
exports.evaluateBadges = evaluateBadges;
exports.evaluateConversationReward = evaluateConversationReward;
exports.describeLevel = describeLevel;
exports.getGamification = getGamification;
exports.persistReward = persistReward;
exports.processConversationReward = processConversationReward;
exports.recordFeedback = recordFeedback;
exports.checkGamificationHealth = checkGamificationHealth;
const supabaseService_1 = require("./supabaseService");
const DEFAULT_GAMIFICATION_URL = process.env.NODE_ENV === 'development'
    ? 'http://127.0.0.1:8002'
    : 'https://edubot-cerdas-production.up.railway.app';
const GAMIFICATION_API_URL = (process.env.GAMIFICATION_API_URL?.trim() ||
    DEFAULT_GAMIFICATION_URL).replace(/\/+$/, '');
const GAMIFICATION_API_KEY = process.env.GAMIFICATION_API_KEY?.trim() || '';
const GAMIFICATION_TIMEOUT = Number(process.env.GAMIFICATION_TIMEOUT) || 10000;
class FeedbackEligibilityError extends Error {
}
exports.FeedbackEligibilityError = FeedbackEligibilityError;
// HTTP HELPERS
function buildHeaders() {
    const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    };
    if (GAMIFICATION_API_KEY) {
        headers.Authorization =
            `Bearer ${GAMIFICATION_API_KEY}`;
    }
    return headers;
}
async function parseResponse(response) {
    const rawText = await response.text();
    let data = {};
    if (rawText.trim()) {
        try {
            data = JSON.parse(rawText);
        }
        catch {
            throw new Error(`Gamification API returned invalid JSON: ${rawText}`);
        }
    }
    if (!response.ok) {
        let message = `Gamification API error: ${response.status}`;
        if (typeof data === 'object' &&
            data !== null) {
            const errorData = data;
            if (errorData.detail !== undefined) {
                message =
                    String(errorData.detail);
            }
            else if (errorData.message !== undefined) {
                message =
                    String(errorData.message);
            }
        }
        throw new Error(message);
    }
    return data;
}
// REWARD API
async function evaluateReward(request) {
    if (!request.event) {
        throw new Error('Reward event is required');
    }
    if (request.event ===
        'helpful_feedback' &&
        !request.feedback) {
        throw new Error('feedback wajib diisi untuk event helpful_feedback');
    }
    let response;
    try {
        response = await fetch(`${GAMIFICATION_API_URL}/reward/evaluate`, {
            method: 'POST',
            signal: AbortSignal.timeout(GAMIFICATION_TIMEOUT),
            headers: buildHeaders(),
            body: JSON.stringify({
                event: request.event,
                current_xp: Number(request.current_xp ?? 0),
                moderation_label: request.moderation_label,
                feedback: request.feedback,
                request_id: request.request_id,
            }),
        });
    }
    catch (error) {
        throw new Error(`Gamification API tidak dapat dihubungi: ${error instanceof Error
            ? error.message
            : String(error)}`);
    }
    return parseResponse(response);
}
// BADGES
async function evaluateBadges(stats) {
    let response;
    try {
        response = await fetch(`${GAMIFICATION_API_URL}/reward/badges`, {
            method: 'POST',
            signal: AbortSignal.timeout(GAMIFICATION_TIMEOUT),
            headers: buildHeaders(),
            body: JSON.stringify({
                conversation_count: Number(stats.conversation_count ?? 0),
                helpful_feedback_count: Number(stats.helpful_feedback_count ?? 0),
                challenge_count: Number(stats.challenge_count ?? 0),
                streak_days: Number(stats.streak_days ?? 0),
            }),
        });
    }
    catch (error) {
        throw new Error(`Gamification badge API tidak dapat dihubungi: ${error instanceof Error
            ? error.message
            : String(error)}`);
    }
    return parseResponse(response);
}
// CONVERSATION REWARD
async function evaluateConversationReward(params) {
    return evaluateReward({
        event: 'conversation_completed',
        current_xp: params.currentXp,
        moderation_label: params.moderationLabel,
        request_id: params.requestId,
    });
}
// GET GAMIFICATION
function describeLevel(xp) {
    const thresholds = [0, 100, 250, 500, 1000];
    const names = ['Learning Explorer', 'Curious Learner', 'Active Learner', 'Problem Solver', 'Learning Champion'];
    const index = thresholds.reduce((found, threshold, i) => xp >= threshold ? i : found, 0);
    const next = thresholds[index + 1] ?? null;
    return { level: index + 1, name: names[index], current_xp: xp, next_level_xp: next,
        progress_to_next_level: next === null ? 1 : (xp - thresholds[index]) / (next - thresholds[index]) };
}
async function getGamification(studentId) {
    if (!studentId)
        throw new Error('studentId wajib diisi');
    const [{ data, error }, profile] = await Promise.all([
        supabaseService_1.supabaseAdmin.from('student_gamification').select('student_id,xp,level,exp_spent,updated_at').eq('student_id', studentId).maybeSingle(),
        supabaseService_1.supabaseAdmin.from('profiles').select('avatar').eq('id', studentId).single(),
    ]);
    if (error || profile.error)
        throw new Error('Failed to get gamification: ' + (error?.message ?? profile.error?.message));
    const xp = Number(data?.xp ?? 0);
    return { studentId, xp, level: Number(data?.level ?? 1), expBalance: xp - Number(data?.exp_spent ?? 0),
        updatedAt: data?.updated_at ?? null, avatar: profile.data?.avatar ?? '🦁', levelInfo: describeLevel(xp) };
}
// PERSIST REWARD
async function persistReward(studentId, requestId, reward, moderationLabel, eventType = 'conversation_completed') {
    if (!studentId || !requestId?.trim() || requestId.length > 200)
        throw new Error('Valid studentId and requestId are required');
    if (!Number.isSafeInteger(reward.reward_delta) || reward.reward_delta < 0)
        throw new Error('Invalid reward amount');
    // Never write a stale total from the calculator. The DB adds the delta and
    // records the event under the same row lock used by avatar purchases.
    const { data, error } = await supabaseService_1.supabaseAdmin.rpc('credit_learning_reward', {
        p_user_id: studentId, p_request_id: requestId, p_event: eventType,
        p_delta: reward.reward_delta, p_label: moderationLabel, p_reason: reward.reason,
    });
    if (error)
        throw new Error('Failed to persist gamification: ' + error.message);
    return { ...reward, reward_delta: data.rewardDelta, new_xp: data.xp,
        level: describeLevel(data.xp), exp_balance: data.expBalance };
}
// PROCESS CONVERSATION REWARD
async function processConversationReward(params) {
    const current = await getGamification(params.studentId);
    const reward = await evaluateConversationReward({
        currentXp: current.xp,
        moderationLabel: params.moderationLabel,
        requestId: params.requestId,
    });
    return persistReward(params.studentId, params.requestId, reward, params.moderationLabel, 'conversation_completed');
}
// RECORD FEEDBACK
async function recordFeedback(params) {
    if (!params.studentId) {
        throw new Error('studentId wajib diisi');
    }
    if (!params.requestId) {
        throw new Error('requestId wajib diisi');
    }
    if (!params.feedback) {
        throw new Error('feedback wajib diisi');
    }
    // Only the owner of a successfully rewarded safe conversation can rate it.
    // A fresh arbitrary ID must never become a source of unlimited XP.
    const { data: conversation, error: conversationError } = await supabaseService_1.supabaseAdmin
        .from('gamification_events')
        .select('id')
        .eq('student_id', params.studentId)
        .eq('request_id', params.requestId)
        .eq('event_type', 'conversation_completed')
        .eq('moderation_label', 'NON_TOXIC')
        .gt('reward_delta', 0)
        .maybeSingle();
    if (conversationError)
        throw new Error('Failed to verify feedback eligibility');
    if (!conversation)
        throw new FeedbackEligibilityError('Feedback hanya tersedia untuk percakapan aman milikmu yang sudah mendapat reward.');
    const current = await getGamification(params.studentId);
    const reward = await evaluateReward({
        event: 'helpful_feedback',
        current_xp: current.xp,
        feedback: params.feedback,
        request_id: params.requestId,
        /*
         * Feedback sendiri bukan input toxic.
         * Gunakan label netral untuk reward event.
         */
        moderation_label: 'NON_TOXIC',
    });
    return persistReward(params.studentId, params.requestId, reward, 'NON_TOXIC', 'helpful_feedback');
}
// HEALTH CHECK
async function checkGamificationHealth() {
    try {
        const response = await fetch(`${GAMIFICATION_API_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(GAMIFICATION_TIMEOUT),
            headers: buildHeaders(),
        });
        if (!response.ok) {
            return false;
        }
        const data = await response.json();
        /*
         * Type guard.
         */
        if (typeof data !== 'object' ||
            data === null) {
            return false;
        }
        const health = data;
        return (health.status === 'ok');
    }
    catch {
        return false;
    }
}
// DEFAULT EXPORT
exports.default = {
    evaluateReward,
    evaluateBadges,
    evaluateConversationReward,
    getGamification,
    persistReward,
    processConversationReward,
    recordFeedback,
    checkGamificationHealth,
};
