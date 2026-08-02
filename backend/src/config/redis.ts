import Redis from 'ioredis'
import { runtimeConfig } from './runtime'

export const redis = new Redis(runtimeConfig.redisUrl, {
  commandTimeout: runtimeConfig.redisCommandTimeoutMs,
  connectTimeout: runtimeConfig.redisCommandTimeoutMs,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy: (attempt) => Math.min(attempt * 100, 2_000),
})

const REDIS_ERROR_LOG_INTERVAL_MS = 30_000
let lastRedisErrorLogAt: number | undefined

redis.on('error', (error: unknown) => {
  const now = Date.now()

  if (
    lastRedisErrorLogAt !== undefined &&
    now - lastRedisErrorLogAt < REDIS_ERROR_LOG_INTERVAL_MS
  ) {
    return
  }

  lastRedisErrorLogAt = now
  console.error({
    message: 'Redis connection error',
    error,
  })
})
