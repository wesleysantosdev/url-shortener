import { beforeEach, describe, expect, it, vi } from 'vitest'
import { originalUrl, shortCode } from '../../tests/helpers/url.fixture'

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}))

const runtimeConfigMock = vi.hoisted(() => ({
  cacheEnabled: true,
  urlCacheTtlSeconds: 86_400,
  negativeCacheTtlSeconds: 60,
}))

vi.mock('../../config/redis', () => ({
  redis: redisMock,
}))

vi.mock('../../config/runtime', () => ({
  runtimeConfig: runtimeConfigMock,
}))

import shortenerCache from './shortener.cache'

describe('shortenerCache', () => {
  beforeEach(() => {
    runtimeConfigMock.cacheEnabled = true
    redisMock.get.mockResolvedValue(null)
    redisMock.set.mockResolvedValue('OK')
  })

  it('returns the cached original URL', async () => {
    redisMock.get.mockResolvedValue(originalUrl)

    await expect(shortenerCache.findOriginalUrl(shortCode)).resolves.toBe(
      originalUrl,
    )
    expect(redisMock.get).toHaveBeenCalledWith(`url-cache:${shortCode}`)
  })

  it('distinguishes a negative-cache hit from a regular miss', async () => {
    redisMock.get.mockResolvedValue('__SHORT_URL_NOT_FOUND__')

    await expect(
      shortenerCache.findOriginalUrl(shortCode),
    ).resolves.toBeNull()
  })

  it('returns undefined on a cache miss', async () => {
    await expect(
      shortenerCache.findOriginalUrl(shortCode),
    ).resolves.toBeUndefined()
  })

  it('falls back to a cache miss when Redis fails', async () => {
    const error = new Error('Redis unavailable')
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    redisMock.get.mockRejectedValue(error)

    await expect(
      shortenerCache.findOriginalUrl(shortCode),
    ).resolves.toBeUndefined()
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Redis cache read failed; falling back to PostgreSQL',
        error,
      }),
    )
  })

  it('does not access Redis when cache is disabled', async () => {
    runtimeConfigMock.cacheEnabled = false

    await expect(
      shortenerCache.findOriginalUrl(shortCode),
    ).resolves.toBeUndefined()
    expect(redisMock.get).not.toHaveBeenCalled()
  })

  it('stores a valid URL for 24 hours', async () => {
    await shortenerCache.storeOriginalUrl(shortCode, originalUrl)

    expect(redisMock.set).toHaveBeenCalledWith(
      `url-cache:${shortCode}`,
      originalUrl,
      'EX',
      86_400,
    )
  })

  it('stores a missing-code marker for 60 seconds', async () => {
    await shortenerCache.storeMissingShortCode(shortCode)

    expect(redisMock.set).toHaveBeenCalledWith(
      `url-cache:${shortCode}`,
      '__SHORT_URL_NOT_FOUND__',
      'EX',
      60,
    )
  })

  it('does not propagate Redis write failures', async () => {
    const error = new Error('Redis unavailable')
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    redisMock.set.mockRejectedValue(error)

    await expect(
      shortenerCache.storeOriginalUrl(shortCode, originalUrl),
    ).resolves.toBeUndefined()
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Redis cache write failed; continuing without cache',
        error,
      }),
    )
  })
})
