import { describe, expect, it } from 'vitest'
import { loadRuntimeConfig } from './runtime'

describe('loadRuntimeConfig', () => {
  it('provides the confirmed architecture defaults', () => {
    expect(
      loadRuntimeConfig({ CORS_ALLOWED_ORIGIN: 'http://localhost:5174' }),
    ).toEqual({
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
        CORS_ALLOWED_ORIGIN: 'https://shortener.example.com/',
      }).corsAllowedOrigin,
    ).toBe('https://shortener.example.com')
  })

  it('parses the baseline benchmark configuration', () => {
    expect(
      loadRuntimeConfig({
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
  ])('rejects invalid %s', (name, value) => {
    expect(() => loadRuntimeConfig({ [name]: value })).toThrow(
      `Invalid ${name}`,
    )
  })
})
