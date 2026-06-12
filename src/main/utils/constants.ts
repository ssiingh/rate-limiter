// Algorithm Names
export const ALGORITHMS = {
  TOKEN_BUCKET: 'token_bucket',
  SLIDING_WINDOW: 'sliding_window',
  FIXED_WINDOW: 'fixed_window',
  LEAKY_BUCKET: 'leaky_bucket',
  COMPOSITE: 'composite',
} as const;

export type AlgorithmName = (typeof ALGORITHMS)[keyof typeof ALGORITHMS];

// Redis Key Prefixes
export const REDIS_KEY_PREFIX = {
  RATE_LIMIT: 'rl',
  TOKEN_BUCKET: 'rl:tb',
  SLIDING_WINDOW: 'rl:sw',
  FIXED_WINDOW: 'rl:fw',
  LEAKY_BUCKET: 'rl:lb',
  COMPOSITE: 'rl:cp',
  API_KEY: 'ak',
  GEO: 'geo',
  METRICS: 'metrics',
  CONFIG: 'cfg',
  BLOCKLIST: 'bl',
  CIRCUIT: 'cb',
  ADAPTIVE: 'adapt',
} as const;

// Default Rate Limit Configurations
export const DEFAULT_LIMITS = {
  REQUESTS_PER_MINUTE: 100,
  REQUESTS_PER_HOUR: 5000,
  REQUESTS_PER_DAY: 50000,
  BURST_SIZE: 20,
  WINDOW_MS: 60_000,
  TOKEN_REFILL_RATE: 10, // tokens per second
  LEAKY_BUCKET_CAPACITY: 100,
  LEAKY_BUCKET_DRAIN_RATE: 10, // per second
} as const;

// HTTP Headers
export const HEADERS = {
  RATE_LIMIT_LIMIT: 'X-RateLimit-Limit',
  RATE_LIMIT_REMAINING: 'X-RateLimit-Remaining',
  RATE_LIMIT_RESET: 'X-RateLimit-Reset',
  RATE_LIMIT_RETRY_AFTER: 'Retry-After',
  RATE_LIMIT_ALGORITHM: 'X-RateLimit-Algorithm',
  RATE_LIMIT_POLICY: 'X-RateLimit-Policy',
  CORRELATION_ID: 'X-Correlation-ID',
  API_KEY: 'X-API-Key',
  TENANT_ID: 'X-Tenant-ID',
  FORWARDED_FOR: 'X-Forwarded-For',
  CF_CONNECTING_IP: 'CF-Connecting-IP',
  CF_IP_COUNTRY: 'CF-IPCountry',
  CLOUDFRONT_VIEWER_COUNTRY: 'CloudFront-Viewer-Country',
  REAL_IP: 'X-Real-IP',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Circuit Breaker States
export const CIRCUIT_STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
} as const;

// Adaptive Rate Limiting
export const ADAPTIVE = {
  MIN_SAMPLES: 100,
  WINDOW_MINUTES: 5,
  SENSITIVITY: 0.8,
  EMA_ALPHA: 0.2,
  ZSCORE_THRESHOLD: 2.5,
  MIN_LIMIT_FLOOR: 10,
  MAX_SCALE_FACTOR: 5.0,
  MIN_SCALE_FACTOR: 0.1,
} as const;

// Metric Names
export const METRICS = {
  REQUESTS_TOTAL: 'rate_limiter_requests_total',
  REQUESTS_ALLOWED: 'rate_limiter_requests_allowed_total',
  REQUESTS_REJECTED: 'rate_limiter_requests_rejected_total',
  REQUEST_DURATION: 'rate_limiter_request_duration_seconds',
  ACTIVE_KEYS: 'rate_limiter_active_keys',
  REDIS_ERRORS: 'rate_limiter_redis_errors_total',
  CIRCUIT_STATE: 'rate_limiter_circuit_breaker_state',
  ADAPTIVE_ADJUSTMENTS: 'rate_limiter_adaptive_adjustments_total',
} as const;

// Time constants
export const TIME = {
  SECOND_MS: 1_000,
  MINUTE_MS: 60_000,
  HOUR_MS: 3_600_000,
  DAY_MS: 86_400_000,
} as const;

// Cache TTLs (seconds)
export const CACHE_TTL = {
  GEO_LOOKUP: 3600,  // 1 hour
  API_KEY: 300,       // 5 minutes
  CONFIG: 60,         // 1 minute
  METRICS: 10,        // 10 seconds
} as const;
