import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictError } from '../../shared/errors'
import {
  originalUrl,
  shortCode,
  urlFixture,
} from '../../tests/helpers/url.fixture'

const repositoryMock = vi.hoisted(() => ({
  createShortUrl: vi.fn(),
  findShortUrl: vi.fn(),
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

vi.mock('./shortener.cache', () => ({
  default: cacheMock,
}))

vi.mock('./click-tracker', () => ({
  default: clickTrackerMock,
}))

import shortenerService from './shortener.service'

describe('shortenerService', () => {
  beforeEach(() => {
    repositoryMock.findShortUrl.mockResolvedValue(null)
    repositoryMock.createShortUrl.mockResolvedValue(urlFixture)
    cacheMock.findOriginalUrl.mockResolvedValue(undefined)
    cacheMock.storeOriginalUrl.mockResolvedValue(undefined)
    cacheMock.storeMissingShortCode.mockResolvedValue(undefined)
    clickTrackerMock.track.mockResolvedValue(undefined)
  })

  it('creates a deterministic eight-character short code', async () => {
    const result = await shortenerService.createShortUrl(originalUrl)

    expect(repositoryMock.findShortUrl).toHaveBeenCalledWith(shortCode)
    expect(repositoryMock.createShortUrl).toHaveBeenCalledWith({
      originalUrl,
      shortCode,
    })
    expect(result).toBe(urlFixture)
  })

  it('throws a conflict error when the short code already exists', async () => {
    repositoryMock.findShortUrl.mockResolvedValue(urlFixture)
    const operation = shortenerService.createShortUrl(originalUrl)

    await expect(operation).rejects.toMatchObject({
      statusCode: 409,
      code: 'SHORT_URL_ALREADY_EXISTS',
    })
    await expect(operation).rejects.toBeInstanceOf(ConflictError)
    expect(repositoryMock.createShortUrl).not.toHaveBeenCalled()
  })

  it('propagates repository errors without replacing them', async () => {
    const repositoryError = new Error('repository unavailable')
    repositoryMock.findShortUrl.mockRejectedValue(repositoryError)

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
