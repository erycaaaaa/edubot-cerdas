"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleChatMessage = handleChatMessage;
const chatService_1 = require("../services/chatService");
const supabaseService_1 = require("../services/supabaseService");
async function persistChatHistory(studentId, schoolId, requestId, inputMessage, responseText, hasViolation) {
    const historyRows = [];
    const trimmedInput = inputMessage.trim();
    if (trimmedInput) {
        historyRows.push({
            student_id: studentId,
            school_id: schoolId,
            role: 'user',
            content: trimmedInput,
            request_id: requestId,
            session_id: requestId,
            is_violation: Boolean(hasViolation),
        });
    }
    if (responseText && responseText.trim()) {
        historyRows.push({
            student_id: studentId,
            school_id: schoolId,
            role: 'assistant',
            content: responseText.trim(),
            request_id: requestId,
            session_id: requestId,
            is_violation: false,
        });
    }
    if (historyRows.length === 0) {
        return;
    }
    const { error } = await supabaseService_1.supabaseAdmin
        .from('chat_history')
        .insert(historyRows);
    if (error) {
        console.error('Failed to persist chat history:', error.message);
    }
}
async function handleChatMessage(req, res) {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({
                error: 'User not authenticated',
            });
            return;
        }
        const { message, requestId } = req.body ?? {};
        if (!message ||
            typeof message !== 'string' ||
            !message.trim()) {
            res.status(400).json({
                error: 'Message cannot be empty',
            });
            return;
        }
        if (message.length > 10000 || (requestId != null &&
            (typeof requestId !== 'string' || !requestId.trim() || requestId.length > 200))) {
            res.status(400).json({ error: 'Pesan maksimal 10000 karakter dan requestId maksimal 200 karakter.' });
            return;
        }
        const validRequestId = requestId &&
            typeof requestId === 'string'
            ? requestId
            : `${user.id}-${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 9)}`;
        const result = await (0, chatService_1.processChat)(user, message.trim(), validRequestId);
        await persistChatHistory(user.id, user.schoolId, validRequestId, message, result.response, result.hasViolation);
        res.json({
            success: result.success,
            data: result,
        });
    }
    catch (error) {
        console.error('Chat controller error:', error);
        res.status(500).json({
            error: 'Failed to process chat message',
            details: error?.message ||
                'Internal server error',
        });
    }
}
