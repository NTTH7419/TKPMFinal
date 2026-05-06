// ─── Constants ────────────────────────────────────────────────────────────────

/** Hold slot duration in milliseconds (10 minutes) */
export const HOLD_SLOT_DURATION_MS = 10 * 60 * 1000;

/** QR token validity buffer after workshop end (30 minutes) */
export const QR_TOKEN_BUFFER_MS = 30 * 60 * 1000;

/** Virtual queue token TTL in seconds (120 seconds) */
export const QUEUE_TOKEN_TTL_SEC = 120;

/** Payment reconcile interval in minutes */
export const PAYMENT_RECONCILE_INTERVAL_MIN = 15;

/** Stale payment threshold: PENDING_PAYMENT older than this is flagged (30 min in ms) */
export const STALE_PAYMENT_THRESHOLD_MS = 30 * 60 * 1000;

/** CSV import error threshold (20%) */
export const IMPORT_ERROR_THRESHOLD_PCT = 20;

/** AI summary constraints */
export const AI_SUMMARY = {
  MAX_PDF_SIZE_BYTES: 20 * 1024 * 1024, // 20 MB
  CHUNK_SIZE_TOKENS: 3000,
  CALL_TIMEOUT_MS: 30_000,
  MAX_RETRIES: 3,
  MIN_OUTPUT_LENGTH: 100,
} as const;

/** Rate limit tiers */
export const RATE_LIMIT = {
  PUBLIC_LISTING: { capacity: 60, refillPerSecond: 10 },
  LOGIN: { capacity: 10, refillPerSecond: 1 },
  REGISTRATION: { capacity: 5, refillPerThirtySeconds: 1 },
  ADMIN: { capacity: 30, refillPerSecond: 5 },
} as const;

/** Circuit breaker config */
export const CIRCUIT_BREAKER = {
  FAILURE_THRESHOLD: 5,
  FAILURE_RATE_THRESHOLD_PCT: 50,
  FAILURE_RATE_MIN_REQUESTS: 10,
  WINDOW_SEC: 30,
  OPEN_DURATION_MS: 30_000,
  HALF_OPEN_PROBES: 3,
  GATEWAY_TIMEOUT_MS: 5_000,
} as const;

/** Redis key patterns */
export const REDIS_KEYS = {
  rateLimitPrefix: (userId: string, endpoint: string) => `rl:${userId}:${endpoint}`,
  queueToken: (userId: string, workshopId: string) => `qt:${userId}:${workshopId}`,
  circuitBreaker: 'cb:payment_gateway',
  circuitBreakerOpenSince: 'cb:payment_gateway:open_since',
  jwtBlocklist: (jti: string) => `jti:${jti}`,
  sseSeats: (workshopId: string) => `ws:${workshopId}:seats`,
} as const;

/** Supabase Storage bucket names */
export const STORAGE_BUCKETS = {
  WORKSHOP_DOCS: 'workshop-docs',
  STUDENT_IMPORTS: 'student-imports',
  QR_CODES: 'qr-codes',
} as const;

/** BullMQ queue names */
export const QUEUE_NAMES = {
  NOTIFICATION: 'notification',
  AI_SUMMARY: 'ai-summary',
  CSV_IMPORT: 'student-import',
  PAYMENT: 'payment',
  HOLD_EXPIRE: 'hold-expire',
} as const;
