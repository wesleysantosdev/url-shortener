import { describe, expect, it } from 'vitest'
import { loadRuntimeConfig } from './runtime'

describe('loadRuntimeConfig', () => {
  const requiredEnvironment = {
    CORS_ALLOWED_ORIGIN: 'http://localhost:5174',
    RATE_LIMIT_IP_HASH_SECRET: 'a'.repeat(32),
  }

  it('provides the confirmed architecture defaults', () => {
    expect(loadRuntimeConfig(requiredEnvironment)).toEqual({
      redisUrl: 'redis://localhost:6379',
      redisCommandTimeoutMs: 100,
      cacheEnabled: true,
      urlCacheTtlSeconds: 86_400,
      negativeCacheTtlSeconds: 60,
      clickTrackingMode: 'async',
      clickBatchSize: 500,
      clickBatchIntervalMs: 5_000,
      clickQueueMaxLength: 1_000_000,
      corsAllowedOrigin: 'http://localhost:5174',
      creationAttemptLimit: 5,
      creationAttemptWindowSeconds: 60,
      creationDailyLimit: 20,
      creationDailyWindowSeconds: 86_400,
      maxActiveUrls: 100_000,
      rateLimitIpHashSecret: 'a'.repeat(32),
      trustProxyHops: 0,
      urlRetentionDays: 30,
      urlDeletionGraceHours: 24,
      urlCleanupIntervalHours: 24,
      urlCleanupBatchSize: 1_000,
    })
  })

  it.each([undefined, ''])('requires CORS_ALLOWED_ORIGIN (%s)', (value) => {
    expect(() =>
      loadRuntimeConfig({ CORS_ALLOWED_ORIGIN: value }),
    ).toThrow('Invalid CORS_ALLOWED_ORIGIN')
  })

  it('normalizes the configured frontend origin', () => {
    expect(
      loadRuntimeConfig({
        ...requiredEnvironment,
        CORS_ALLOWED_ORIGIN: 'https://shortener.example.com/',
      }).corsAllowedOrigin,
    ).toBe('https://shortener.example.com')
  })

  it('parses the baseline benchmark configuration', () => {
    expect(
      loadRuntimeConfig({
        ...requiredEnvironment,
        CACHE_ENABLED: 'false',
        CLICK_TRACKING_MODE: 'sync',
        REDIS_URL: 'redis://redis:6379',
        CLICK_BATCH_SIZE: '100',
        CORS_ALLOWED_ORIGIN: 'http://localhost:5174',
      }),
    ).toMatchObject({
      cacheEnabled: false,
      clickTrackingMode: 'sync',
      redisUrl: 'redis://redis:6379',
      clickBatchSize: 100,
    })
  })

  it.each([
    ['CACHE_ENABLED', 'sometimes'],
    ['CLICK_TRACKING_MODE', 'eventually'],
    ['CLICK_BATCH_SIZE', '0'],
    ['REDIS_COMMAND_TIMEOUT_MS', '-1'],
    ['CORS_ALLOWED_ORIGIN', 'ftp://shortener.example.com'],
    ['CREATION_ATTEMPT_LIMIT', '0'],
    ['CREATION_DAILY_WINDOW_SECONDS', '1.5'],
    ['MAX_ACTIVE_URLS', '-1'],
    ['TRUST_PROXY_HOPS', '-1'],
    ['URL_RETENTION_DAYS', '0'],
    ['URL_CLEANUP_BATCH_SIZE', 'many'],
  ])('rejects invalid %s', (name, value) => {
    expect(() =>
      loadRuntimeConfig({ ...requiredEnvironment, [name]: value }),
    ).toThrow(
      `Invalid ${name}`,
    )
  })

  it.each([undefined, '', 'short'])(
    'requires a strong RATE_LIMIT_IP_HASH_SECRET (%s)',
    (value) => {
      expect(() =>
        loadRuntimeConfig({
          CORS_ALLOWED_ORIGIN: 'http://localhost:5174',
          RATE_LIMIT_IP_HASH_SECRET: value,
        }),
      ).toThrow('Invalid RATE_LIMIT_IP_HASH_SECRET')
    },
  )
})
