"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleChatMessage = exports.processChat = void 0;
exports.processChatMessage = processChatMessage;
const moderationService_1 = require("./moderationService");
const strikeService_1 = require("./strikeService");
const gamificationService_1 = require("./gamificationService");
const supabaseService_1 = require("./supabaseService");
const node_crypto_1 = require("node:crypto");
async function getStudentProfile(studentId) {
    const { data, error, } = await supabaseService_1.supabaseAdmin
        .from('profiles')
        .select(`
      id,
      school_id,
      name,
      avatar
    `)
        .eq('id', studentId)
        .single();
    if (error) {
        throw new Error(`Gagal mengambil profile siswa: ${error.message}`);
    }
    if (!data) {
        throw new Error('Profile siswa tidak ditemukan');
    }
    return data;
}
function normalizeModerationResult(moderation) {
    const label = moderation.label === 'TOXIC'
        ? 'TOXIC'
        : 'NON_TOXIC';
    const probabilityToxic = Number(moderation.probabilityToxic ?? 0);
    const threshold = Number(moderation.threshold ?? 0);
    const nChunks = Number(moderation.nChunks ?? 1);
    const action = moderation.action === 'REJECT'
        ? 'REJECT'
        : 'CONTINUE';
    const detectedWords = Array.isArray(moderation.detectedWords)
        ? moderation.detectedWords
        : [];
    return {
        label,
        probabilityToxic,
        threshold,
        nChunks,
        action,
        detectedWords,
    };
}
async function processGamification(studentId, moderationLabel, requestId) {
    const reward = await (0, gamificationService_1.processConversationReward)({
        studentId,
        requestId,
        moderationLabel,
    });
    return {
        rewardDelta: Number(reward.reward_delta ?? 0),
        expBalance: reward.exp_balance,
        levelInfo: reward.level,
        newXp: Number(reward.new_xp ?? 0),
        level: Number(reward.level?.level ?? 1),
        levelName: reward.level?.name ??
            'Learning Explorer',
        reason: reward.reason ??
            '',
        safetyGate: reward.safety_gate,
    };
}
async function handleToxicMessage(user, message, requestId, moderation) {
    /**
     * Ambil profile siswa dari public.profiles.
     *
     * Database:
     * - full_name
     * - name
     * - avatar
     */
    const profile = await getStudentProfile(user.id);
    const studentName = profile.full_name ||
        profile.name ||
        'Siswa';
    const studentAvatar = profile.avatar ||
        '🦁';
    const strike = await (0, strikeService_1.addStrike)({
        requestId,
        studentId: user.id,
        schoolId: profile.school_id,
        studentName,
        studentAvatar,
        message,
        detectedWords: moderation.detectedWords ??
            [],
    });
    return {
        strikeLevel: strike.strikeLevel,
        strikeCount: strike.strikeCount,
        isBlocked: strike.isBlocked,
        notificationId: strike.notificationId,
    };
}
async function processChatMessage(user, message, requestId) {
    /**
     * Request ID menjadi identifier utama
     * untuk seluruh pipeline.
     */
    const validRequestId = requestId?.trim() ||
        (0, node_crypto_1.randomUUID)();
    // VALIDATION
    const cleanMessage = String(message ?? '').trim();
    if (!cleanMessage) {
        return {
            success: false,
            status: 'REJECTED_INPUT_UNSAFE',
            requestId: validRequestId,
            hasViolation: false,
            detectedWords: [],
            response: 'Pesan tidak boleh kosong.',
            moderation: {
                label: 'NON_TOXIC',
                probabilityToxic: 0,
                threshold: 0,
                nChunks: 0,
                action: 'REJECT',
                detectedWords: [],
            },
            error: 'Message is empty',
        };
    }
    // 1. INPUT MODERATION
    let moderationResult;
    try {
        moderationResult =
            await (0, moderationService_1.moderateMessage)(cleanMessage, validRequestId);
    }
    catch (error) {
        console.error('Moderation error:', error);
        return {
            success: false,
            status: 'MODERATION_NOT_AVAILABLE',
            requestId: validRequestId,
            hasViolation: false,
            detectedWords: [],
            response: 'Maaf, layanan keamanan AI sedang tidak tersedia. Silakan coba lagi.',
            moderation: {
                label: 'NON_TOXIC',
                probabilityToxic: 0,
                threshold: 0,
                nChunks: 0,
                action: 'REJECT',
                detectedWords: [],
            },
            error: 'Moderation service unavailable',
        };
    }
    const moderation = normalizeModerationResult(moderationResult);
    // MODERATION SERVICE DOWN
    /**
     * IMPORTANT:
     *
     * serviceAvailable = false
     *
     * bukan berarti TOXIC.
     *
     * Jangan beri strike.
     * Jangan teruskan ke Qwen.
     */
    if (moderationResult.serviceAvailable ===
        false) {
        return {
            success: false,
            status: 'MODERATION_NOT_AVAILABLE',
            requestId: validRequestId,
            hasViolation: false,
            detectedWords: [],
            response: 'Maaf, layanan keamanan AI sedang tidak tersedia. Silakan coba lagi.',
            moderation,
            error: 'Moderation service unavailable',
        };
    }
    // 2. INPUT TOXIC
    /**
     * STRIKE HANYA jika:
     *
     * serviceAvailable === true
     * DAN
     * label === TOXIC
     *
     * Jangan menggunakan action === REJECT
     * sebagai satu-satunya trigger strike.
     */
    if (moderationResult.serviceAvailable &&
        moderationResult.label === 'TOXIC') {
        let strike;
        try {
            strike =
                await handleToxicMessage(user, cleanMessage, validRequestId, moderationResult);
        }
        catch (error) {
            console.error('Strike processing error:', error);
            return {
                success: false,
                status: 'REJECTED_INPUT_UNSAFE',
                requestId: validRequestId,
                hasViolation: true,
                detectedWords: moderation.detectedWords,
                response: 'Permintaan ditolak karena terdeteksi mengandung bahasa toxic.',
                moderation,
                error: 'Failed to process toxicity violation',
            };
        }
        // TOXIC MESSAGE DOES NOT GET XP
        let gamification;
        try {
            gamification =
                await processGamification(user.id, 'TOXIC', validRequestId);
        }
        catch (error) {
            console.error('Gamification error for toxic message:', error);
        }
        return {
            success: true,
            status: 'REJECTED_INPUT_UNSAFE',
            requestId: validRequestId,
            hasViolation: true,
            detectedWords: moderation.detectedWords,
            strikeCount: strike?.strikeCount ?? 0,
            isBlocked: strike?.isBlocked ?? false,
            response: 'Maaf, saya tidak dapat membantu dengan permintaan tersebut. Silakan ajukan pertanyaan yang aman dan sesuai dengan ruang lingkup PJOK.',
            moderation,
            strike,
            gamification,
        };
    }
    // 3. GENERATE RESPONSE
    let generatedResponse;
    try {
        generatedResponse =
            await (0, moderationService_1.generateLocalResponse)(cleanMessage, validRequestId);
    }
    catch (error) {
        console.error('Generator error:', error);
        return {
            success: false,
            status: 'GENERATOR_NOT_AVAILABLE',
            requestId: validRequestId,
            hasViolation: false,
            detectedWords: [],
            response: 'Maaf, layanan AI sedang mengalami gangguan. Silakan coba lagi.',
            moderation,
            error: 'Generator service unavailable',
        };
    }
    // 4. OUTPUT MODERATION
    let outputModerationResult;
    try {
        outputModerationResult =
            await (0, moderationService_1.moderateMessage)(generatedResponse, validRequestId);
    }
    catch (error) {
        console.error('Output moderation error:', error);
        return {
            success: false,
            status: 'MODERATION_NOT_AVAILABLE',
            requestId: validRequestId,
            hasViolation: false,
            detectedWords: [],
            response: 'Maaf, layanan keamanan AI sedang tidak tersedia. Silakan coba lagi.',
            moderation,
            error: 'Output moderation service unavailable',
        };
    }
    const outputModeration = normalizeModerationResult(outputModerationResult);
    // OUTPUT MODERATION UNAVAILABLE
    if (outputModerationResult.serviceAvailable ===
        false) {
        return {
            success: false,
            status: 'MODERATION_NOT_AVAILABLE',
            requestId: validRequestId,
            hasViolation: false,
            detectedWords: [],
            response: 'Maaf, layanan keamanan AI sedang tidak tersedia. Silakan coba lagi.',
            moderation,
            outputModeration,
            error: 'Output moderation service unavailable',
        };
    }
    // OUTPUT TOXIC
    /**
     * Output TOXIC tidak menghasilkan strike
     * kepada siswa karena yang toxic adalah
     * hasil generator, bukan input siswa.
     *
     * Kita hanya menolak output tersebut.
     */
    if (outputModerationResult.serviceAvailable &&
        outputModerationResult.label === 'TOXIC') {
        return {
            success: false,
            status: 'REJECTED_OUTPUT_UNSAFE',
            requestId: validRequestId,
            hasViolation: false,
            detectedWords: [],
            response: 'Maaf, saya tidak dapat menampilkan jawaban tersebut. Silakan coba pertanyaan lainnya.',
            moderation,
            outputModeration,
            error: 'Generated response did not pass toxicity moderation',
        };
    }
    // 5. GAMIFICATION
    let gamification;
    try {
        /**
         * Input NON_TOXIC
         * +
         * Output NON_TOXIC
         *
         * =>
         * conversation reward.
         */
        gamification =
            await processGamification(user.id, 'NON_TOXIC', validRequestId);
    }
    catch (error) {
        /**
         * Gamification tidak boleh membuat
         * chatbot gagal memberikan jawaban.
         */
        console.error('Gamification error:', error);
    }
    // 6. SUCCESS
    return {
        success: true,
        status: 'OK',
        requestId: validRequestId,
        hasViolation: false,
        detectedWords: [],
        response: generatedResponse,
        moderation,
        outputModeration,
        gamification,
    };
}
/**
 * Jika controller lama memanggil processChat(),
 * kode tersebut tetap dapat digunakan.
 */
exports.processChat = processChatMessage;
/**
 * Jika controller lama menggunakan
 * handleChatMessage(), juga disediakan.
 */
exports.handleChatMessage = processChatMessage;
exports.default = processChatMessage;
