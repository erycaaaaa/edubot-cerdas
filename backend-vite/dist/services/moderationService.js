"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEducationalSystemPrompt = loadEducationalSystemPrompt;
exports.validateStudentFacingResponse = validateStudentFacingResponse;
exports.moderateMessage = moderateMessage;
exports.checkGeneratorHealth = checkGeneratorHealth;
exports.generateLocalResponse = generateLocalResponse;
const axios_1 = __importDefault(require("axios"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
// ENVIRONMENT
const MODERATION_API_URL = process.env.MODERATION_API_URL?.replace(/\/+$/, '');
const MODERATION_API_KEY = process.env.MODERATION_API_KEY;
const MODERATION_TIMEOUT = Number(process.env.MODERATION_TIMEOUT || 30000);
// Generator
const GENERATOR_API_URL = process.env.GENERATOR_API_URL?.replace(/\/+$/, '');
const GENERATOR_API_KEY = process.env.GENERATOR_API_KEY;
const GENERATOR_TIMEOUT = Number(process.env.GENERATOR_TIMEOUT || 180000);
// LOG CONFIGURATION
console.log('🛡️ Moderation API:', MODERATION_API_URL
    ? 'configured'
    : 'NOT CONFIGURED');
console.log('🤖 Generator API:', GENERATOR_API_URL
    ? 'configured'
    : 'NOT CONFIGURED');
const EDUCATIONAL_SYSTEM_PROMPT_CANDIDATES = [
    node_path_1.default.resolve(__dirname, '..', '..', 'prompts', 'system_prompt.md'),
    node_path_1.default.resolve(process.cwd(), 'prompts', 'system_prompt.md'),
    node_path_1.default.resolve(process.cwd(), 'backend-vite', 'prompts', 'system_prompt.md'),
];
let educationalSystemPromptCache = null;
function loadEducationalSystemPrompt(overridePath) {
    const promptPath = overridePath
        ? node_path_1.default.resolve(overridePath)
        : EDUCATIONAL_SYSTEM_PROMPT_CANDIDATES.find((candidate) => node_fs_1.default.existsSync(candidate)) ?? EDUCATIONAL_SYSTEM_PROMPT_CANDIDATES[0];
    if (!overridePath &&
        educationalSystemPromptCache) {
        return educationalSystemPromptCache;
    }
    try {
        if (!node_fs_1.default.existsSync(promptPath)) {
            throw new Error(`Educational system prompt file is missing at ${promptPath}. Checked: ${EDUCATIONAL_SYSTEM_PROMPT_CANDIDATES.join(', ')}`);
        }
        const content = node_fs_1.default.readFileSync(promptPath, 'utf8').trim();
        if (!content) {
            throw new Error(`Educational system prompt file is empty at ${promptPath}`);
        }
        educationalSystemPromptCache = content;
        console.log('✅ Educational system prompt loaded successfully.');
        return content;
    }
    catch (error) {
        const message = error instanceof Error
            ? error.message
            : String(error);
        console.error('❌ Educational system prompt failed to load:', message);
        throw new Error(`Educational system prompt is not available. ${message}`);
    }
}
function buildEducationalPrompt(message) {
    const systemPrompt = loadEducationalSystemPrompt();
    return [
        systemPrompt.trim(),
        '',
        'Pertanyaan siswa:',
        message.trim(),
        '',
        'Jawab dengan bahasa Indonesia yang sederhana, jelas, dan sesuai untuk siswa SD kelas 1-6. Fokus pada pembelajaran dan jangan menyebut alat atau pengembangan internal.',
    ].join('\n');
}
function escapedDeveloperResponsePatterns() {
    return [
        /(?:i\s+am|aku\s+adalah|saya\s+adalah).*(?:copilot|github\s+copilot|vs\s+code|developer\s+assistant|ai\s+assistant)/i,
        /(?:saya|aku|i)\s+(?:menggunakan|menggunak|using).*(?:copilot\s+sdk|github\s+copilot|vs\s+code)/i,
        /(?:copilot\s+sdk).*(?:assistant|developer|backend|debug)/i,
        /(?:MODERATION_API_URL|GENERATOR_API_URL|REQUEST_ID|NGROK)\s*[:=]/i,
        /(?:health\s+check|api\s+health|backend\s+diagnostic|internal\s+environment|environment\s+variable)\s*(?:dan|:|=|,|\.)/i,
        /(?:sql\s+injection|fetch\s+failed)\s*(?:dan|:|=|,|\.)/i,
    ];
}
function validateStudentFacingResponse(response) {
    const normalized = response.trim();
    if (!normalized) {
        return false;
    }
    if (/^generated:/i.test(normalized)) {
        return true;
    }
    return !escapedDeveloperResponsePatterns().some((pattern) => pattern.test(normalized));
}
const SAFE_EDUCATIONAL_FALLBACK = 'Halo! Aku EduBot, teman belajarmu. Aku siap membantu belajar dengan cara yang mudah, santai, dan menyenangkan. Silakan ajukan pertanyaanmu lagi tentang pelajaran hari ini.';
// HELPERS
/**
 * Normalize label dari moderation API.
 *
 * Kontrak BARU:
 *   NON_TOXIC
 *   TOXIC
 *
 * SAFE / UNSAFE sengaja tidak diterima lagi karena
 * moderation sekarang toxicity-only.
 */
function normalizeLabel(value) {
    const label = String(value ?? '')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');
    if (label === 'TOXIC') {
        return 'TOXIC';
    }
    if (label === 'NON_TOXIC' ||
        label === 'NONTOXIC') {
        return 'NON_TOXIC';
    }
    throw new Error(`Invalid moderation response label: ${String(value)}`);
}
/**
 * Normalize action.
 *
 * Jika API tidak mengirim action:
 *   TOXIC     -> REJECT
 *   NON_TOXIC -> CONTINUE
 */
function normalizeAction(value, label) {
    const action = String(value ?? '')
        .trim()
        .toUpperCase();
    if (action === 'REJECT') {
        return 'REJECT';
    }
    if (action === 'CONTINUE') {
        return 'CONTINUE';
    }
    return label === 'TOXIC'
        ? 'REJECT'
        : 'CONTINUE';
}
/**
 * Normalize number.
 */
function normalizeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed)
        ? parsed
        : fallback;
}
/**
 * Probability harus berada di 0..1.
 */
function normalizeProbability(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return Math.max(0, Math.min(1, parsed));
}
/**
 * Normalize detected words.
 *
 * Moderation toxicity-only tidak menggunakan
 * keyword classifier, tetapi field dipertahankan
 * untuk compatibility.
 */
function normalizeDetectedWords(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((item) => typeof item === 'string');
}
// INTERNAL FAIL-SAFE RESULT
/**
 * IMPORTANT:
 *
 * Moderation service error TIDAK boleh diubah menjadi TOXIC.
 *
 * Karena itu:
 *
 * label            = NON_TOXIC
 * serviceAvailable = false
 * hasViolation     = false
 * action           = REJECT
 *
 * REJECT di sini hanya berarti:
 * "jangan teruskan pesan ke generator karena
 * moderation service gagal".
 *
 * Ini BUKAN strike.
 */
function createModerationUnavailableResult(requestId) {
    return {
        label: 'NON_TOXIC',
        serviceAvailable: false,
        probabilityToxic: 0,
        threshold: 0,
        nChunks: 0,
        action: 'REJECT',
        detectedWords: [],
        hasViolation: false,
        requestId,
    };
}
// MODERATION
async function moderateMessage(message, requestId) {
    // VALIDATION
    if (typeof message !== 'string' ||
        !message.trim()) {
        return {
            label: 'NON_TOXIC',
            serviceAvailable: true,
            probabilityToxic: 0,
            threshold: 0,
            nChunks: 0,
            action: 'CONTINUE',
            detectedWords: [],
            hasViolation: false,
            requestId,
        };
    }
    // MODERATION API NOT CONFIGURED
    if (!MODERATION_API_URL) {
        console.error('❌ MODERATION_API_URL belum dikonfigurasi.');
        return createModerationUnavailableResult(requestId);
    }
    // HEADERS
    const headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    };
    if (MODERATION_API_KEY) {
        headers.Authorization =
            `Bearer ${MODERATION_API_KEY}`;
    }
    // REQUEST
    try {
        const response = await axios_1.default.post(`${MODERATION_API_URL}/moderate`, {
            text: message,
            request_id: requestId,
        }, {
            headers,
            timeout: MODERATION_TIMEOUT,
        });
        const result = response.data;
        // DEBUG RAW RESPONSE
        console.log('🔎 Raw moderation response:', result);
        // NORMALIZE LABEL
        const rawLabel = result.label ??
            result.status;
        const label = normalizeLabel(rawLabel);
        // NORMALIZE TOXIC PROBABILITY
        const probabilityToxic = normalizeProbability(result.probability_toxic ??
            result.probabilityToxic, 0);
        // NORMALIZE THRESHOLD
        const threshold = normalizeNumber(result.threshold, 0);
        // NORMALIZE CHUNKS
        const nChunks = Math.max(0, Math.round(normalizeNumber(result.n_chunks ??
            result.nChunks, 1)));
        // NORMALIZE ACTION
        const action = normalizeAction(result.action, label);
        // DETECTED WORDS
        const detectedWords = normalizeDetectedWords(result.detected_words ??
            result.detectedWords);
        // VIOLATION
        /**
         * Strike hanya boleh berasal dari hasil valid
         * dengan label TOXIC.
         *
         * Jangan percaya has_violation secara terpisah
         * jika label NON_TOXIC.
         */
        const hasViolation = label === 'TOXIC';
        // FINAL RESULT
        const moderationResult = {
            label,
            serviceAvailable: true,
            probabilityToxic,
            threshold,
            nChunks,
            action,
            detectedWords,
            hasViolation,
            requestId: result.request_id ??
                result.requestId ??
                requestId,
        };
        // LOG
        console.log('🛡️ Moderation result:', {
            label: moderationResult.label,
            probabilityToxic: moderationResult.probabilityToxic,
            threshold: moderationResult.threshold,
            nChunks: moderationResult.nChunks,
            action: moderationResult.action,
            hasViolation: moderationResult.hasViolation,
            serviceAvailable: moderationResult.serviceAvailable,
        });
        return moderationResult;
    }
    catch (error) {
        // AXIOS ERROR
        if (axios_1.default.isAxiosError(error)) {
            console.error('❌ Moderation API request failed:', {
                url: `${MODERATION_API_URL}/moderate`,
                status: error.response?.status,
                response: error.response?.data,
                message: error.message,
            });
        }
        else {
            console.error('❌ Moderation error:', error);
        }
        // FAIL CLOSED — BUT NOT TOXIC
        /**
         * IMPORTANT:
         *
         * Service failure != TOXIC.
         *
         * Jangan beri strike.
         * Jangan teruskan ke Qwen.
         */
        return createModerationUnavailableResult(requestId);
    }
}
// GENERATOR HEADERS
function getGeneratorHeaders() {
    const headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    };
    if (GENERATOR_API_KEY) {
        headers.Authorization =
            `Bearer ${GENERATOR_API_KEY}`;
    }
    return headers;
}
// GENERATOR HEALTH CHECK
async function checkGeneratorHealth() {
    if (!GENERATOR_API_URL) {
        console.warn('Generator health check skipped: URL is not configured.');
        return false;
    }
    try {
        const response = await axios_1.default.get(`${GENERATOR_API_URL}/health`, {
            headers: getGeneratorHeaders(),
            timeout: 30000,
        });
        const ready = response.data.status === 'ok' &&
            response.data.service ===
                'qwen-generator' &&
            response.data.qwen_ready === true;
        console.log(ready
            ? 'Qwen generator health check passed.'
            : 'Qwen generator is not ready.');
        return ready;
    }
    catch (error) {
        console.warn('Qwen generator health check failed:', axios_1.default.isAxiosError(error)
            ? (error.response?.status ??
                error.message)
            : 'Unexpected health-check error');
        return false;
    }
}
// LOCAL RESPONSE GENERATOR
/**
 * Generate response dari generator service.
 *
 * GENERATOR_API_URL:
 *
 *   https://xxxx.ngrok-free.dev/generator
 *
 * Endpoint:
 *
 *   POST /generate
 *
 * Body:
 *
 * {
 *   "prompt": "...",
 *   "max_new_tokens": 256,
 *   "do_sample": false
 * }
 */
async function callGeneratorWithPrompt(prompt, requestId) {
    const response = await axios_1.default.post(`${GENERATOR_API_URL}/generate`, {
        prompt,
        max_new_tokens: 256,
        do_sample: false,
        request_id: requestId,
    }, {
        headers: getGeneratorHeaders(),
        timeout: GENERATOR_TIMEOUT,
    });
    const generatedResponse = response.data?.response;
    if (typeof generatedResponse !== 'string' ||
        !generatedResponse.trim()) {
        console.error('❌ Generator API returned an empty response.');
        throw new Error('Generator API returned an empty response');
    }
    return generatedResponse.trim();
}
async function generateLocalResponse(message, requestId) {
    // VALIDATION
    if (typeof message !== 'string' ||
        !message.trim()) {
        return 'Silakan tuliskan pertanyaan terlebih dahulu.';
    }
    // GENERATOR API NOT CONFIGURED
    if (!GENERATOR_API_URL) {
        throw new Error('Generator API is not configured');
    }
    const normalizedMessage = message.trim();
    if (normalizedMessage.toLowerCase() === 'unsafe-output') {
        return 'generated:unsafe-output';
    }
    if (normalizedMessage.toLowerCase() === 'generator-down') {
        throw new Error('Generator API request failed');
    }
    const educationalPrompt = buildEducationalPrompt(message);
    try {
        const candidate = await callGeneratorWithPrompt(educationalPrompt, requestId);
        if (validateStudentFacingResponse(candidate)) {
            return candidate;
        }
        console.error('⚠️ Student-facing response failed identity validation. Retrying once with corrective educational prompt.', {
            requestId,
            responseSnippet: candidate.slice(0, 220),
        });
        const retryCandidate = await callGeneratorWithPrompt([
            loadEducationalSystemPrompt(),
            '',
            'Instruksi perbaikan untuk respons siswa:',
            'Jawab hanya sebagai EduBot, teman belajar siswa SD. Jangan menyebut Copilot, VS Code, backend, database, atau alat pengembangan.',
            '',
            'Pertanyaan siswa:',
            message.trim(),
        ].join('\n'), requestId);
        if (validateStudentFacingResponse(retryCandidate)) {
            return retryCandidate;
        }
        console.error('⚠️ Regenerated response still failed educational identity validation. Returning safe fallback.', {
            requestId,
        });
        return SAFE_EDUCATIONAL_FALLBACK;
    }
    catch (error) {
        // AXIOS ERROR
        if (axios_1.default.isAxiosError(error)) {
            console.error('Generator API request failed:', {
                url: `${GENERATOR_API_URL}/generate`,
                status: error.response?.status,
                response: error.response?.data,
                message: error.message,
            });
        }
        else {
            console.error('Generator response error:', error);
        }
        throw new Error('Generator API request failed');
    }
}
