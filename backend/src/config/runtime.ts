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
  }
}

export const runtimeConfig = loadRuntimeConfig(process.env)
