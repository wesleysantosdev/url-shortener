import 'dotenv/config'

export interface RuntimeConfig {
  redisUrl: string
  redisCommandTimeoutMs: number
  cacheEnabled: boolean
  urlCacheTtlSeconds: number
  negativeCacheTtlSeconds: number
  clickTrackingMode: 'async' | 'sync'
  clickBatchSize: number
  clickBatchIntervalMs: number
  clickQueueMaxLength: number
  corsAllowedOrigin: string
  creationAttemptLimit: number
  creationAttemptWindowSeconds: number
  creationDailyLimit: number
  creationDailyWindowSeconds: number
  maxActiveUrls: number
  rateLimitIpHashSecret: string
  trustProxyHops: number
  urlRetentionDays: number
  urlDeletionGraceHours: number
  urlCleanupIntervalHours: number
  urlCleanupBatchSize: number
}

function httpOrigin(
  env: NodeJS.ProcessEnv,
  name: string,
): string {
  const rawValue = env[name]

  if (rawValue === undefined || rawValue.trim() === '') {
    throw new Error(
      `Invalid ${name} ${JSON.stringify(rawValue)}: expected a required HTTP or HTTPS origin`,
    )
  }

  try {
    const url = new URL(rawValue)
    const hasHttpProtocol = url.protocol === 'http:' || url.protocol === 'https:'
    const hasOnlyOrigin =
      url.pathname === '/' &&
      url.search === '' &&
      url.hash === '' &&
      url.username === '' &&
      url.password === ''

    if (!hasHttpProtocol || !hasOnlyOrigin) {
      throw new Error('invalid origin')
    }

    return url.origin
  } catch {
    throw new Error(
      `Invalid ${name} ${JSON.stringify(rawValue)}: expected an HTTP or HTTPS origin`,
    )
  }
}

function positiveInteger(
  env: NodeJS.ProcessEnv,
  name: string,
  defaultValue: number,
): number {
  const rawValue = env[name]

  if (rawValue === undefined) {
    return defaultValue
  }

  const value = Number(rawValue)

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid ${name}: expected a positive integer`)
  }

  return value
}

function nonNegativeInteger(
  env: NodeJS.ProcessEnv,
  name: string,
  defaultValue: number,
): number {
  const rawValue = env[name]

  if (rawValue === undefined) {
    return defaultValue
  }

  const value = Number(rawValue)

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid ${name}: expected a non-negative integer`)
  }

  return value
}

function strongSecret(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]

  if (value === undefined || value.length < 32) {
    throw new Error(
      `Invalid ${name}: expected at least 32 characters`,
    )
  }

  return value
}

function boolean(
  env: NodeJS.ProcessEnv,
  name: string,
  defaultValue: boolean,
): boolean {
  const rawValue = env[name]

  if (rawValue === undefined) {
    return defaultValue
  }

  if (rawValue === 'true') {
    return true
  }

  if (rawValue === 'false') {
    return false
  }

  throw new Error(`Invalid ${name}: expected true or false`)
}

function clickTrackingMode(
  env: NodeJS.ProcessEnv,
): RuntimeConfig['clickTrackingMode'] {
  const mode = env.CLICK_TRACKING_MODE ?? 'async'

  if (mode !== 'async' && mode !== 'sync') {
    throw new Error(
      'Invalid CLICK_TRACKING_MODE: expected async or sync',
    )
  }

  return mode
}

export function loadRuntimeConfig(
  env: NodeJS.ProcessEnv,
): RuntimeConfig {
  return {
    redisUrl: env.REDIS_URL ?? 'redis://localhost:6379',
    redisCommandTimeoutMs: positiveInteger(
      env,
      'REDIS_COMMAND_TIMEOUT_MS',
      100,
    ),
    cacheEnabled: boolean(env, 'CACHE_ENABLED', true),
    urlCacheTtlSeconds: positiveInteger(
      env,
      'REDIS_URL_CACHE_TTL_SECONDS',
      86_400,
    ),
    negativeCacheTtlSeconds: positiveInteger(
      env,
      'REDIS_NEGATIVE_CACHE_TTL_SECONDS',
      60,
    ),
    clickTrackingMode: clickTrackingMode(env),
    clickBatchSize: positiveInteger(env, 'CLICK_BATCH_SIZE', 500),
    clickBatchIntervalMs: positiveInteger(
      env,
      'CLICK_BATCH_INTERVAL_MS',
      5_000,
    ),
    clickQueueMaxLength: positiveInteger(
      env,
      'CLICK_QUEUE_MAX_LENGTH',
      1_000_000,
    ),
    corsAllowedOrigin: httpOrigin(
      env,
      'CORS_ALLOWED_ORIGIN',
    ),
    creationAttemptLimit: positiveInteger(
      env,
      'CREATION_ATTEMPT_LIMIT',
      5,
    ),
    creationAttemptWindowSeconds: positiveInteger(
      env,
      'CREATION_ATTEMPT_WINDOW_SECONDS',
      60,
    ),
    creationDailyLimit: positiveInteger(env, 'CREATION_DAILY_LIMIT', 20),
    creationDailyWindowSeconds: positiveInteger(
      env,
      'CREATION_DAILY_WINDOW_SECONDS',
      86_400,
    ),
    maxActiveUrls: positiveInteger(env, 'MAX_ACTIVE_URLS', 100_000),
    rateLimitIpHashSecret: strongSecret(env, 'RATE_LIMIT_IP_HASH_SECRET'),
    trustProxyHops: nonNegativeInteger(env, 'TRUST_PROXY_HOPS', 0),
    urlRetentionDays: positiveInteger(env, 'URL_RETENTION_DAYS', 30),
    urlDeletionGraceHours: positiveInteger(
      env,
      'URL_DELETION_GRACE_HOURS',
      24,
    ),
    urlCleanupIntervalHours: positiveInteger(
      env,
      'URL_CLEANUP_INTERVAL_HOURS',
      24,
    ),
    urlCleanupBatchSize: positiveInteger(
      env,
      'URL_CLEANUP_BATCH_SIZE',
      1_000,
    ),
  }
}

export const runtimeConfig = loadRuntimeConfig(process.env)
