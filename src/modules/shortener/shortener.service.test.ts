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

vi.mock('./shortener.repository', () => ({
  default: repositoryMock,
}))

import shortenerService from './shortener.service'

describe('shortenerService', () => {
  beforeEach(() => {
    repositoryMock.findShortUrl.mockResolvedValue(null)
    repositoryMock.createShortUrl.mockResolvedValue(urlFixture)
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
})
