import { describe, expect, it } from 'vitest'
import { loadRuntimeConfig } from './runtime'

describe('loadRuntimeConfig', () => {
  it('provides the confirmed architecture defaults', () => {
    expect(loadRuntimeConfig({})).toEqual({
      redisUrl: 'redis://localhost:6379',
      redisCommandTimeoutMs: 100,
      cacheEnabled: true,
      urlCacheTtlSeconds: 86_400,
      negativeCacheTtlSeconds: 60,
      clickTrackingMode: 'async',
      clickBatchSize: 500,
      clickBatchIntervalMs: 5_000,
      clickQueueMaxLength: 1_000_000,
    })
  })

  it('parses the baseline benchmark configuration', () => {
    expect(
      loadRuntimeConfig({
        CACHE_ENABLED: 'false',
        CLICK_TRACKING_MODE: 'sync',
        REDIS_URL: 'redis://redis:6379',
        CLICK_BATCH_SIZE: '100',
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
  ])('rejects invalid %s', (name, value) => {
    expect(() => loadRuntimeConfig({ [name]: value })).toThrow(
      `Invalid ${name}`,
    )
  })
})
