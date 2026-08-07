import { describe, expect, it } from 'vitest'
import { loadRuntimeConfig } from './runtime'

describe('loadRuntimeConfig', () => {
  const requiredEnvironment = {
    CORS_ALLOWED_ORIGIN: 'http://localhost:5173',
    PUBLIC_SHORT_URL_BASE: 'http://localhost:5000',
    RATE_LIMIT_IP_HASH_SECRET: 'a'.repeat(32),
    SHORT_CODE_SECRET: 'b'.repeat(32),
  }

  it('provides the confirmed architecture defaults', () => {
    expect(loadRuntimeConfig(requiredEnvironment)).toEqual({
      redisUrl: 'redis://localhost:6379',
      redisCommandTimeoutMs: 100,
      urlCacheTtlSeconds: 86_400,
      negativeCacheTtlSeconds: 60,
      corsAllowedOrigin: 'http://localhost:5173',
      publicShortUrlBase: 'http://localhost:5000',
      creationAttemptLimit: 5,
      creationAttemptWindowSeconds: 60,
      creationDailyLimit: 20,
      creationDailyWindowSeconds: 86_400,
      rateLimitIpHashSecret: 'a'.repeat(32),
      shortCodeSecret: 'b'.repeat(32),
      trustProxyHops: 0,
      urlRetentionDays: 180,
      urlCleanupIntervalHours: 24,
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

  it('normalizes a public short URL base with a path', () => {
    expect(
      loadRuntimeConfig({
        ...requiredEnvironment,
        PUBLIC_SHORT_URL_BASE: 'https://short.example.com/go/',
      }).publicShortUrlBase,
    ).toBe('https://short.example.com/go')
  })

  it.each([
    ['REDIS_COMMAND_TIMEOUT_MS', '-1'],
    ['CORS_ALLOWED_ORIGIN', 'ftp://shortener.example.com'],
    ['PUBLIC_SHORT_URL_BASE', 'ftp://short.example.com'],
    ['PUBLIC_SHORT_URL_BASE', 'https://user:password@short.example.com'],
    ['CREATION_ATTEMPT_LIMIT', '0'],
    ['CREATION_DAILY_WINDOW_SECONDS', '1.5'],
    ['TRUST_PROXY_HOPS', '-1'],
    ['URL_RETENTION_DAYS', '0'],
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
          PUBLIC_SHORT_URL_BASE: 'http://localhost:5000',
          RATE_LIMIT_IP_HASH_SECRET: value,
          SHORT_CODE_SECRET: 'b'.repeat(32),
        }),
      ).toThrow('Invalid RATE_LIMIT_IP_HASH_SECRET')
    },
  )

  it.each([undefined, '', 'short'])(
    'requires a strong SHORT_CODE_SECRET (%s)',
    (value) => {
      expect(() =>
        loadRuntimeConfig({
          CORS_ALLOWED_ORIGIN: 'http://localhost:5174',
          PUBLIC_SHORT_URL_BASE: 'http://localhost:5000',
          RATE_LIMIT_IP_HASH_SECRET: 'a'.repeat(32),
          SHORT_CODE_SECRET: value,
        }),
      ).toThrow('Invalid SHORT_CODE_SECRET')
    },
  )
})
