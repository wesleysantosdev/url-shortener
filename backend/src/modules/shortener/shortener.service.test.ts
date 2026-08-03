import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShortCodeGenerationError } from '../../shared/errors'
import {
  originalUrl,
  shortCode,
  urlFixture,
} from '../../tests/helpers/url.fixture'

const repositoryMock = vi.hoisted(() => ({
  createShortUrlWithinCapacity: vi.fn(),
  findShortUrl: vi.fn(),
  recordClick: vi.fn(),
}))

const generateShortCodeMock = vi.hoisted(() => vi.fn())

const runtimeConfigMock = vi.hoisted(() => ({
  maxActiveUrls: 100_000,
  urlRetentionDays: 30,
}))

const cacheMock = vi.hoisted(() => ({
  findOriginalUrl: vi.fn(),
  storeOriginalUrl: vi.fn(),
  storeMissingShortCode: vi.fn(),
}))

const clickTrackerMock = vi.hoisted(() => ({
  track: vi.fn(),
}))

vi.mock('./shortener.repository', () => ({
  default: repositoryMock,
}))

vi.mock('./short-code', async (importOriginal) => {
  const original = await importOriginal<typeof import('./short-code')>()
  return {
    ...original,
    generateShortCode: generateShortCodeMock,
  }
})

vi.mock('../../config/runtime', () => ({
  runtimeConfig: runtimeConfigMock,
}))

vi.mock('./shortener.cache', () => ({
  default: cacheMock,
}))

vi.mock('./click-tracker', () => ({
  default: clickTrackerMock,
}))

import shortenerService from './shortener.service'
import { ShortCodeCollisionError } from './short-code'

describe('shortenerService', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    repositoryMock.findShortUrl.mockResolvedValue(null)
    repositoryMock.recordClick.mockResolvedValue(undefined)
    repositoryMock.createShortUrlWithinCapacity.mockResolvedValue(urlFixture)
    generateShortCodeMock.mockReturnValue('aB3dE5g7')
    cacheMock.findOriginalUrl.mockResolvedValue(undefined)
    cacheMock.storeOriginalUrl.mockResolvedValue(undefined)
    cacheMock.storeMissingShortCode.mockResolvedValue(undefined)
    clickTrackerMock.track.mockResolvedValue(undefined)
  })

  it('creates a random eight-character short code within capacity', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T12:00:00.000Z'))

    const result = await shortenerService.createShortUrl(originalUrl)

    expect(repositoryMock.createShortUrlWithinCapacity).toHaveBeenCalledWith(
      {
        originalUrl,
        shortCode: 'aB3dE5g7',
        expiresAt: new Date('2026-09-02T12:00:00.000Z'),
      },
      100_000,
    )
    expect(result).toBe(urlFixture)
  })

  it('allows the same original URL to receive different short codes', async () => {
    generateShortCodeMock
      .mockReturnValueOnce('aB3dE5g7')
      .mockReturnValueOnce('Z9y8X7w6')

    await shortenerService.createShortUrl(originalUrl)
    await shortenerService.createShortUrl(originalUrl)

    expect(repositoryMock.createShortUrlWithinCapacity).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ originalUrl, shortCode: 'aB3dE5g7' }),
      100_000,
    )
    expect(repositoryMock.createShortUrlWithinCapacity).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ originalUrl, shortCode: 'Z9y8X7w6' }),
      100_000,
    )
  })

  it('retries a short-code collision without exposing a conflict', async () => {
    generateShortCodeMock
      .mockReturnValueOnce('aB3dE5g7')
      .mockReturnValueOnce('Z9y8X7w6')
    repositoryMock.createShortUrlWithinCapacity
      .mockRejectedValueOnce(new ShortCodeCollisionError())
      .mockResolvedValueOnce(urlFixture)

    await expect(
      shortenerService.createShortUrl(originalUrl),
    ).resolves.toBe(urlFixture)
    expect(repositoryMock.createShortUrlWithinCapacity).toHaveBeenCalledTimes(2)
  })

  it('returns a service error after five short-code collisions', async () => {
    repositoryMock.createShortUrlWithinCapacity.mockRejectedValue(
      new ShortCodeCollisionError(),
    )

    const operation = shortenerService.createShortUrl(originalUrl)

    await expect(operation).rejects.toBeInstanceOf(ShortCodeGenerationError)
    expect(repositoryMock.createShortUrlWithinCapacity).toHaveBeenCalledTimes(5)
  })

  it('propagates non-collision repository errors without replacing them', async () => {
    const repositoryError = new Error('repository unavailable')
    repositoryMock.createShortUrlWithinCapacity.mockRejectedValue(repositoryError)

    await expect(shortenerService.createShortUrl(originalUrl)).rejects.toBe(
      repositoryError,
    )
  })

  it('resolves a short URL from cache without querying PostgreSQL', async () => {
    cacheMock.findOriginalUrl.mockResolvedValue(originalUrl)

    await expect(shortenerService.resolveShortUrl(shortCode)).resolves.toBe(
      originalUrl,
    )
    expect(repositoryMock.findShortUrl).not.toHaveBeenCalled()
    expect(clickTrackerMock.track).toHaveBeenCalledWith(shortCode)
  })

  it('stores a database result after a cache miss', async () => {
    repositoryMock.findShortUrl.mockResolvedValue(urlFixture)

    await expect(shortenerService.resolveShortUrl(shortCode)).resolves.toBe(
      originalUrl,
    )
    expect(cacheMock.storeOriginalUrl).toHaveBeenCalledWith(
      shortCode,
      originalUrl,
    )
    expect(clickTrackerMock.track).toHaveBeenCalledWith(shortCode)
  })

  it('revives a quarantined database result before redirecting', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T12:00:00.000Z'))
    repositoryMock.findShortUrl.mockResolvedValue({
      ...urlFixture,
      quarantinedAt: new Date('2026-08-03T10:00:00.000Z'),
    })

    await expect(shortenerService.resolveShortUrl(shortCode)).resolves.toBe(
      originalUrl,
    )
    expect(repositoryMock.recordClick).toHaveBeenCalledWith({
      shortCode,
      count: 1,
      lastAccessedAt: new Date('2026-08-03T12:00:00.000Z'),
      expiresAt: new Date('2026-09-02T12:00:00.000Z'),
    })
    expect(clickTrackerMock.track).not.toHaveBeenCalled()
  })

  it('returns not found from negative cache without querying PostgreSQL', async () => {
    cacheMock.findOriginalUrl.mockResolvedValue(null)

    await expect(
      shortenerService.resolveShortUrl(shortCode),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'SHORT_URL_NOT_FOUND',
    })
    expect(repositoryMock.findShortUrl).not.toHaveBeenCalled()
    expect(clickTrackerMock.track).not.toHaveBeenCalled()
  })

  it('negative-caches a short code missing from PostgreSQL', async () => {
    repositoryMock.findShortUrl.mockResolvedValue(null)

    await expect(
      shortenerService.resolveShortUrl(shortCode),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'SHORT_URL_NOT_FOUND',
    })
    expect(cacheMock.storeMissingShortCode).toHaveBeenCalledWith(shortCode)
    expect(clickTrackerMock.track).not.toHaveBeenCalled()
  })
})
