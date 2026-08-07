import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { originalUrl, urlFixture } from '../../tests/helpers/url.fixture'
import { ShortCodeCodec } from './short-code'

const runtimeConfigMock = vi.hoisted(() => ({
  shortCodeSecret: 'test-short-code-secret-with-32-chars',
  publicShortUrlBase: 'https://sho.rt/go',
}))
const { shortCodeSecret, publicShortUrlBase } = runtimeConfigMock
const codec = new ShortCodeCodec(shortCodeSecret)
const shortCode = codec.encode(urlFixture.id)

const repositoryMock = vi.hoisted(() => ({
  createShortUrl: vi.fn(),
  findShortUrl: vi.fn(),
  recordClick: vi.fn(),
}))

const cacheMock = vi.hoisted(() => ({
  findOriginalUrl: vi.fn(),
  storeOriginalUrl: vi.fn(),
  storeMissingShortCode: vi.fn(),
}))

vi.mock('./shortener.repository', () => ({ default: repositoryMock }))
vi.mock('./shortener.cache', () => ({ default: cacheMock }))
vi.mock('../../config/runtime', () => ({
  runtimeConfig: runtimeConfigMock,
}))

import shortenerService from './shortener.service'

describe('shortenerService', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    repositoryMock.createShortUrl.mockResolvedValue(urlFixture)
    repositoryMock.findShortUrl.mockResolvedValue(null)
    repositoryMock.recordClick.mockResolvedValue(undefined)
    cacheMock.findOriginalUrl.mockResolvedValue(undefined)
    cacheMock.storeOriginalUrl.mockResolvedValue(undefined)
    cacheMock.storeMissingShortCode.mockResolvedValue(undefined)
  })

  it('creates once and returns only the public URL derived from its ID', async () => {
    await expect(shortenerService.createShortUrl(originalUrl)).resolves.toBe(
      `${publicShortUrlBase}/${shortCode}`,
    )

    expect(repositoryMock.createShortUrl).toHaveBeenCalledOnce()
    expect(repositoryMock.createShortUrl).toHaveBeenCalledWith(originalUrl)
    expect(repositoryMock.findShortUrl).not.toHaveBeenCalled()
  })

  it('gives repeated original URLs different codes from their different IDs', async () => {
    repositoryMock.createShortUrl
      .mockResolvedValueOnce(urlFixture)
      .mockResolvedValueOnce({ ...urlFixture, id: 2n })

    const first = await shortenerService.createShortUrl(originalUrl)
    const second = await shortenerService.createShortUrl(originalUrl)

    expect(first).not.toBe(second)
    expect(repositoryMock.createShortUrl).toHaveBeenCalledTimes(2)
  })

  it('decodes a cache hit to the ID and records its click directly', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-04T12:00:00.000Z'))
    cacheMock.findOriginalUrl.mockResolvedValue(originalUrl)

    await expect(shortenerService.resolveShortUrl(shortCode)).resolves.toBe(
      originalUrl,
    )

    expect(repositoryMock.findShortUrl).not.toHaveBeenCalled()
    expect(repositoryMock.recordClick).toHaveBeenCalledWith(
      urlFixture.id,
      new Date('2026-08-04T12:00:00.000Z'),
    )
  })

  it('stores a database result after a cache miss', async () => {
    repositoryMock.findShortUrl.mockResolvedValue(urlFixture)

    await expect(shortenerService.resolveShortUrl(shortCode)).resolves.toBe(
      originalUrl,
    )

    expect(repositoryMock.findShortUrl).toHaveBeenCalledWith(urlFixture.id)
    expect(cacheMock.storeOriginalUrl).toHaveBeenCalledWith(shortCode, originalUrl)
    expect(repositoryMock.recordClick).toHaveBeenCalledWith(
      urlFixture.id,
      expect.any(Date),
    )
  })

  it('keeps a known redirect available when click persistence fails', async () => {
    const error = new Error('database unavailable')
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    cacheMock.findOriginalUrl.mockResolvedValue(originalUrl)
    repositoryMock.recordClick.mockRejectedValue(error)

    await expect(shortenerService.resolveShortUrl(shortCode)).resolves.toBe(
      originalUrl,
    )
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Click tracking failed', error }),
    )
  })

  it('returns not found for a structurally valid but non-canonical code', async () => {
    await expect(shortenerService.resolveShortUrl('00000')).rejects.toMatchObject({
      statusCode: 404,
      code: 'SHORT_URL_NOT_FOUND',
    })
    expect(cacheMock.findOriginalUrl).not.toHaveBeenCalled()
    expect(repositoryMock.findShortUrl).not.toHaveBeenCalled()
  })

  it('returns not found from negative cache without querying PostgreSQL', async () => {
    cacheMock.findOriginalUrl.mockResolvedValue(null)

    await expect(shortenerService.resolveShortUrl(shortCode)).rejects.toMatchObject({
      statusCode: 404,
      code: 'SHORT_URL_NOT_FOUND',
    })
    expect(repositoryMock.findShortUrl).not.toHaveBeenCalled()
  })

  it('negative-caches an ID missing from PostgreSQL', async () => {
    await expect(shortenerService.resolveShortUrl(shortCode)).rejects.toMatchObject({
      statusCode: 404,
      code: 'SHORT_URL_NOT_FOUND',
    })
    expect(cacheMock.storeMissingShortCode).toHaveBeenCalledWith(shortCode)
  })
})
