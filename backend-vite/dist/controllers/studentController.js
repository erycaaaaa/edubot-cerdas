"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyStrikes = getMyStrikes;
exports.getMyGamification = getMyGamification;
exports.submitGamificationFeedback = submitGamificationFeedback;
exports.getMyChatHistory = getMyChatHistory;
const supabaseService_1 = require("../services/supabaseService");
const gamificationService_1 = require("../services/gamificationService");
/**
 * GET /api/me/strikes
 *
 * Mengambil status strike student yang sedang login.
 */
async function getMyStrikes(req, res) {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({
                error: 'User not authenticated',
            });
            return;
        }
        // Get latest profile state
        const { data: profile, error: profileErr } = await supabaseService_1.supabaseAdmin
            .from('profiles')
            .select('strike_count, is_blocked')
            .eq('id', user.id)
            .single();
        if (profileErr) {
            res.status(500).json({
                error: 'Failed to fetch student profile',
                details: profileErr.message,
            });
            return;
        }
        // Get student violations
        const { data: violations, error: violationsErr } = await supabaseService_1.supabaseAdmin
            .from('violations')
            .select('id, message, detected_words, strike_level, created_at')
            .eq('student_id', user.id)
            .order('created_at', {
            ascending: false,
        })
            .limit(10);
        if (violationsErr) {
            console.error('Failed to fetch violations:', violationsErr);
        }
        res.json({
            success: true,
            data: {
                strikeCount: profile?.strike_count ?? 0,
                isBlocked: profile?.is_blocked ?? false,
                violations: violations || [],
            },
        });
    }
    catch (error) {
        console.error('Student controller error:', error);
        res.status(500).json({
            error: 'Failed to get strike status',
            details: error?.message || 'Internal server error',
        });
    }
}
/**
 * GET /api/me/gamification
 *
 * Mengambil data XP, level, streak, dan badge
 * milik student yang sedang login.
 */
async function getMyGamification(req, res) {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({
                error: 'User not authenticated',
            });
            return;
        }
        const data = await (0, gamificationService_1.getGamification)(user.id);
        res.json({
            success: true,
            data,
        });
    }
    catch (error) {
        console.error('Gamification controller error:', error);
        res.status(500).json({
            error: 'Failed to fetch gamification data',
            details: error?.message || 'Internal server error',
        });
    }
}
/**
 * POST /api/me/gamification/feedback
 *
 * Body:
 * {
 *   "feedback": "helpful",
 *   "requestId": "..."
 * }
 */
async function submitGamificationFeedback(req, res) {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({
                error: 'User not authenticated',
            });
            return;
        }
        const { feedback, requestId } = req.body ?? {};
        // Validate feedback
        if (feedback !== 'helpful' &&
            feedback !== 'not_helpful') {
            res.status(400).json({
                error: 'feedback harus helpful atau not_helpful',
            });
            return;
        }
        if (typeof requestId !== 'string' || !requestId.trim() || requestId.length > 200) {
            res.status(400).json({ error: 'requestId percakapan wajib diisi (maksimal 200 karakter).' });
            return;
        }
        const validRequestId = requestId.trim();
        /**
         * recordFeedback menerima SATU object argument.
         *
         * Sebelumnya:
         * recordFeedback(user.id, feedback, validRequestId)
         *
         * Itu menyebabkan:
         * Expected 1 arguments, but got 3.
         */
        const data = await (0, gamificationService_1.recordFeedback)({
            studentId: user.id,
            feedback,
            requestId: validRequestId,
        });
        res.json({
            success: true,
            data,
        });
    }
    catch (error) {
        if (error instanceof gamificationService_1.FeedbackEligibilityError) {
            res.status(409).json({ error: error.message });
            return;
        }
        console.error('Gamification feedback controller error:', error);
        res.status(500).json({
            error: 'Failed to process gamification feedback',
        });
    }
}
async function getMyChatHistory(req, res) {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({
                error: 'User not authenticated',
            });
            return;
        }
        const { data, error } = await supabaseService_1.supabaseAdmin
            .from('chat_history')
            .select('id, role, content, request_id, session_id, is_violation, created_at')
            .eq('student_id', user.id)
            .order('created_at', { ascending: true })
            .limit(200);
        if (error) {
            console.error('Failed to fetch chat history:', error.message);
            res.status(500).json({
                error: 'Failed to fetch chat history',
                details: error.message,
            });
            return;
        }
        res.json({
            success: true,
            data: data ?? [],
        });
    }
    catch (error) {
        console.error('Chat history controller error:', error);
        res.status(500).json({
            error: 'Failed to fetch chat history',
            details: error?.message || 'Internal server error',
        });
    }
}
