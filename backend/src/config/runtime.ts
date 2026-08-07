import 'dotenv/config'

export interface RuntimeConfig {
  redisUrl: string
  redisCommandTimeoutMs: number
  urlCacheTtlSeconds: number
  negativeCacheTtlSeconds: number
  corsAllowedOrigin: string
  publicShortUrlBase: string
  creationAttemptLimit: number
  creationAttemptWindowSeconds: number
  creationDailyLimit: number
  creationDailyWindowSeconds: number
  rateLimitIpHashSecret: string
  shortCodeSecret: string
  trustProxyHops: number
  urlRetentionDays: number
  urlCleanupIntervalHours: number
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

function httpUrlBase(
  env: NodeJS.ProcessEnv,
  name: string,
): string {
  const rawValue = env[name]

  if (rawValue === undefined || rawValue.trim() === '') {
    throw new Error(
      `Invalid ${name} ${JSON.stringify(rawValue)}: expected a required HTTP or HTTPS URL base`,
    )
  }

  try {
    const url = new URL(rawValue)
    const hasHttpProtocol = url.protocol === 'http:' || url.protocol === 'https:'
    const hasSafeBase =
      url.search === '' &&
      url.hash === '' &&
      url.username === '' &&
      url.password === ''

    if (!hasHttpProtocol || !hasSafeBase) {
      throw new Error('invalid URL base')
    }

    const path = url.pathname.replace(/\/+$/, '')
    return `${url.origin}${path}`
  } catch {
    throw new Error(
      `Invalid ${name} ${JSON.stringify(rawValue)}: expected an HTTP or HTTPS URL base without credentials, query, or fragment`,
    )
  }
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
    corsAllowedOrigin: httpOrigin(
      env,
      'CORS_ALLOWED_ORIGIN',
    ),
    publicShortUrlBase: httpUrlBase(env, 'PUBLIC_SHORT_URL_BASE'),
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
    rateLimitIpHashSecret: strongSecret(env, 'RATE_LIMIT_IP_HASH_SECRET'),
    shortCodeSecret: strongSecret(env, 'SHORT_CODE_SECRET'),
    trustProxyHops: nonNegativeInteger(env, 'TRUST_PROXY_HOPS', 0),
    urlRetentionDays: positiveInteger(env, 'URL_RETENTION_DAYS', 180),
    urlCleanupIntervalHours: positiveInteger(
      env,
      'URL_CLEANUP_INTERVAL_HOURS',
      24,
    ),
  }
}

export const runtimeConfig = loadRuntimeConfig(process.env)
