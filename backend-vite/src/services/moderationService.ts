import axios from 'axios';

// ============================================================
// TYPES
// ============================================================

export type ModerationLabel =
  | 'NON_TOXIC'
  | 'TOXIC';

export type ModerationAction =
  | 'CONTINUE'
  | 'REJECT';

export interface ModerationResult {
  label: ModerationLabel;

  /**
   * true hanya jika moderation service benar-benar
   * berhasil memberikan hasil valid.
   */
  serviceAvailable: boolean;

  /**
   * Probability dari kelas TOXIC.
   */
  probabilityToxic: number;

  /**
   * Threshold yang digunakan oleh moderation model.
   */
  threshold: number;

  /**
   * Jumlah chunk yang diproses model.
   */
  nChunks: number;

  /**
   * Action berdasarkan hasil moderation.
   */
  action: ModerationAction;

  /**
   * Saat ini moderation model tidak bergantung
   * pada keyword. Field ini dipertahankan
   * untuk kompatibilitas backend lama.
   */
  detectedWords: string[];

  /**
   * true hanya ketika hasil moderation valid
   * dan label = TOXIC.
   */
  hasViolation: boolean;

  requestId?: string;
}

// ============================================================
// ENVIRONMENT
// ============================================================

const MODERATION_API_URL =
  process.env.MODERATION_API_URL?.replace(/\/+$/, '');

const MODERATION_API_KEY =
  process.env.MODERATION_API_KEY;

const MODERATION_TIMEOUT =
  Number(process.env.MODERATION_TIMEOUT || 30000);

// ------------------------------------------------------------
// Generator
// ------------------------------------------------------------

const GENERATOR_API_URL =
  process.env.GENERATOR_API_URL?.replace(/\/+$/, '');

const GENERATOR_API_KEY =
  process.env.GENERATOR_API_KEY;

const GENERATOR_TIMEOUT =
  Number(process.env.GENERATOR_TIMEOUT || 180000);

// ============================================================
// LOG CONFIGURATION
// ============================================================

console.log(
  '🛡️ Moderation API:',
  MODERATION_API_URL
    ? 'configured'
    : 'NOT CONFIGURED',
);

console.log(
  '🤖 Generator API:',
  GENERATOR_API_URL
    ? 'configured'
    : 'NOT CONFIGURED',
);

// ============================================================
// HELPERS
// ============================================================

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
function normalizeLabel(
  value: unknown,
): ModerationLabel {
  const label = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (label === 'TOXIC') {
    return 'TOXIC';
  }

  if (
    label === 'NON_TOXIC' ||
    label === 'NONTOXIC'
  ) {
    return 'NON_TOXIC';
  }

  throw new Error(
    `Invalid moderation response label: ${String(value)}`,
  );
}

/**
 * Normalize action.
 *
 * Jika API tidak mengirim action:
 *   TOXIC     -> REJECT
 *   NON_TOXIC -> CONTINUE
 */
function normalizeAction(
  value: unknown,
  label: ModerationLabel,
): ModerationAction {
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
function normalizeNumber(
  value: unknown,
  fallback = 0,
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

/**
 * Probability harus berada di 0..1.
 */
function normalizeProbability(
  value: unknown,
  fallback = 0,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(
    0,
    Math.min(1, parsed),
  );
}

/**
 * Normalize detected words.
 *
 * Moderation toxicity-only tidak menggunakan
 * keyword classifier, tetapi field dipertahankan
 * untuk compatibility.
 */
function normalizeDetectedWords(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (
      item,
    ): item is string =>
      typeof item === 'string',
  );
}

// ============================================================
// MODERATION API RESPONSE
// ============================================================

interface ModerationApiResponse {
  label?: string;

  /**
   * Beberapa API lama mungkin menggunakan status.
   * Kita tetap membaca field ini sebagai fallback.
   */
  status?: string;

  // New toxicity-only contract
  probability_toxic?: number;
  probabilityToxic?: number;

  threshold?: number;

  n_chunks?: number;
  nChunks?: number;

  action?: string;

  request_id?: string;
  requestId?: string;

  detected_words?: string[];
  detectedWords?: string[];

  has_violation?: boolean;
  hasViolation?: boolean;

  message?: string;

  model?: string;
  version?: string;
}

// ============================================================
// INTERNAL FAIL-SAFE RESULT
// ============================================================

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
function createModerationUnavailableResult(
  requestId?: string,
): ModerationResult {
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

// ============================================================
// MODERATION
// ============================================================

export async function moderateMessage(
  message: string,
  requestId?: string,
): Promise<ModerationResult> {

  // ==========================================================
  // VALIDATION
  // ==========================================================

  if (
    typeof message !== 'string' ||
    !message.trim()
  ) {
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

  // ==========================================================
  // MODERATION API NOT CONFIGURED
  // ==========================================================

  if (!MODERATION_API_URL) {
    console.error(
      '❌ MODERATION_API_URL belum dikonfigurasi.',
    );

    return createModerationUnavailableResult(
      requestId,
    );
  }

  // ==========================================================
  // HEADERS
  // ==========================================================

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };

  if (MODERATION_API_KEY) {
    headers.Authorization =
      `Bearer ${MODERATION_API_KEY}`;
  }

  // ==========================================================
  // REQUEST
  // ==========================================================

  try {
    const response =
      await axios.post<ModerationApiResponse>(
        `${MODERATION_API_URL}/moderate`,
        {
          text: message,
          request_id: requestId,
        },
        {
          headers,
          timeout: MODERATION_TIMEOUT,
        },
      );

    const result = response.data;

    // ========================================================
    // DEBUG RAW RESPONSE
    // ========================================================

    console.log(
      '🔎 Raw moderation response:',
      result,
    );

    // ========================================================
    // NORMALIZE LABEL
    // ========================================================

    const rawLabel =
      result.label ??
      result.status;

    const label =
      normalizeLabel(rawLabel);

    // ========================================================
    // NORMALIZE TOXIC PROBABILITY
    // ========================================================

    const probabilityToxic =
      normalizeProbability(
        result.probability_toxic ??
        result.probabilityToxic,
        0,
      );

    // ========================================================
    // NORMALIZE THRESHOLD
    // ========================================================

    const threshold =
      normalizeNumber(
        result.threshold,
        0,
      );

    // ========================================================
    // NORMALIZE CHUNKS
    // ========================================================

    const nChunks =
      Math.max(
        0,
        Math.round(
          normalizeNumber(
            result.n_chunks ??
            result.nChunks,
            1,
          ),
        ),
      );

    // ========================================================
    // NORMALIZE ACTION
    // ========================================================

    const action =
      normalizeAction(
        result.action,
        label,
      );

    // ========================================================
    // DETECTED WORDS
    // ========================================================

    const detectedWords =
      normalizeDetectedWords(
        result.detected_words ??
        result.detectedWords,
      );

    // ========================================================
    // VIOLATION
    // ========================================================

    /**
     * Strike hanya boleh berasal dari hasil valid
     * dengan label TOXIC.
     *
     * Jangan percaya has_violation secara terpisah
     * jika label NON_TOXIC.
     */
    const hasViolation =
      label === 'TOXIC';

    // ========================================================
    // FINAL RESULT
    // ========================================================

    const moderationResult: ModerationResult = {
      label,

      serviceAvailable: true,

      probabilityToxic,

      threshold,

      nChunks,

      action,

      detectedWords,

      hasViolation,

      requestId:
        result.request_id ??
        result.requestId ??
        requestId,
    };

    // ========================================================
    // LOG
    // ========================================================

    console.log(
      '🛡️ Moderation result:',
      {
        label:
          moderationResult.label,

        probabilityToxic:
          moderationResult.probabilityToxic,

        threshold:
          moderationResult.threshold,

        nChunks:
          moderationResult.nChunks,

        action:
          moderationResult.action,

        hasViolation:
          moderationResult.hasViolation,

        serviceAvailable:
          moderationResult.serviceAvailable,
      },
    );

    return moderationResult;

  } catch (error) {

    // ========================================================
    // AXIOS ERROR
    // ========================================================

    if (axios.isAxiosError(error)) {
      console.error(
        '❌ Moderation API request failed:',
        {
          url:
            `${MODERATION_API_URL}/moderate`,

          status:
            error.response?.status,

          response:
            error.response?.data,

          message:
            error.message,
        },
      );
    } else {
      console.error(
        '❌ Moderation error:',
        error,
      );
    }

    // ========================================================
    // FAIL CLOSED — BUT NOT TOXIC
    // ========================================================

    /**
     * IMPORTANT:
     *
     * Service failure != TOXIC.
     *
     * Jangan beri strike.
     * Jangan teruskan ke Qwen.
     */
    return createModerationUnavailableResult(
      requestId,
    );
  }
}

// ============================================================
// GENERATOR TYPES
// ============================================================

interface GeneratorApiResponse {
  response?: string;
}

interface GeneratorHealthResponse {
  status?: string;
  service?: string;
  qwen_ready?: boolean;
}

// ============================================================
// GENERATOR HEADERS
// ============================================================

function getGeneratorHeaders():
  Record<string, string> {

  const headers:
    Record<string, string> = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    };

  if (GENERATOR_API_KEY) {
    headers.Authorization =
      `Bearer ${GENERATOR_API_KEY}`;
  }

  return headers;
}

// ============================================================
// GENERATOR HEALTH CHECK
// ============================================================

export async function checkGeneratorHealth():
  Promise<boolean> {

  if (!GENERATOR_API_URL) {
    console.warn(
      'Generator health check skipped: URL is not configured.',
    );

    return false;
  }

  try {
    const response =
      await axios.get<GeneratorHealthResponse>(
        `${GENERATOR_API_URL}/health`,
        {
          headers:
            getGeneratorHeaders(),

          timeout: 30000,
        },
      );

    const ready =
      response.data.status === 'ok' &&
      response.data.service ===
        'qwen-generator' &&
      response.data.qwen_ready === true;

    console.log(
      ready
        ? 'Qwen generator health check passed.'
        : 'Qwen generator is not ready.',
    );

    return ready;

  } catch (error) {

    console.warn(
      'Qwen generator health check failed:',
      axios.isAxiosError(error)
        ? (
            error.response?.status ??
            error.message
          )
        : 'Unexpected health-check error',
    );

    return false;
  }
}

// ============================================================
// LOCAL RESPONSE GENERATOR
// ============================================================

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
export async function generateLocalResponse(
  message: string,
  requestId?: string,
): Promise<string> {

  // ==========================================================
  // VALIDATION
  // ==========================================================

  if (
    typeof message !== 'string' ||
    !message.trim()
  ) {
    return 'Silakan tuliskan pertanyaan terlebih dahulu.';
  }

  // ==========================================================
  // GENERATOR API NOT CONFIGURED
  // ==========================================================

  if (!GENERATOR_API_URL) {
    throw new Error(
      'Generator API is not configured',
    );
  }

  // ==========================================================
  // CALL GENERATOR
  // ==========================================================

  try {
    const response =
      await axios.post<GeneratorApiResponse>(
        `${GENERATOR_API_URL}/generate`,
        {
          prompt: message,

          max_new_tokens: 256,

          do_sample: false,

          request_id: requestId,
        },
        {
          headers:
            getGeneratorHeaders(),

          timeout:
            GENERATOR_TIMEOUT,
        },
      );

    const generatedResponse =
      response.data?.response;

    // ========================================================
    // EMPTY RESPONSE
    // ========================================================

    if (
      typeof generatedResponse !== 'string' ||
      !generatedResponse.trim()
    ) {
      console.error(
        '❌ Generator API returned an empty response.',
      );

      throw new Error(
        'Generator API returned an empty response',
      );
    }

    return generatedResponse.trim();

  } catch (error) {

    // ========================================================
    // AXIOS ERROR
    // ========================================================

    if (axios.isAxiosError(error)) {
      console.error(
        'Generator API request failed:',
        {
          url:
            `${GENERATOR_API_URL}/generate`,

          status:
            error.response?.status,

          response:
            error.response?.data,

          message:
            error.message,
        },
      );
    } else {
      console.error(
        'Generator response error:',
        error,
      );
    }

    throw new Error(
      'Generator API request failed',
    );
  }
}