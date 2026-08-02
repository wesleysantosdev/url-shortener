import { Prisma } from '../../../prisma/generated/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictError, DatabaseError } from '../../shared/errors'
import {
  shortCode,
  urlFixture,
} from '../../tests/helpers/url.fixture'

const prismaMock = vi.hoisted(() => ({
  url: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('../../config/database', () => ({
  prisma: prismaMock,
}))

import shortenerRepository from './shortener.repository'

describe('shortenerRepository', () => {
  beforeEach(() => {
    prismaMock.url.create.mockResolvedValue(urlFixture)
    prismaMock.url.findUnique.mockResolvedValue(urlFixture)
    prismaMock.url.update.mockResolvedValue(urlFixture)
    prismaMock.$transaction.mockResolvedValue([])
  })

  it('returns the created URL', async () => {
    const data = {
      originalUrl: urlFixture.originalUrl,
      shortCode: urlFixture.shortCode,
    }

    await expect(shortenerRepository.createShortUrl(data)).resolves.toBe(urlFixture)
    expect(prismaMock.url.create).toHaveBeenCalledWith({ data })
  })

  it('returns null when the short code does not exist', async () => {
    prismaMock.url.findUnique.mockResolvedValue(null)

    await expect(shortenerRepository.findShortUrl(shortCode)).resolves.toBeNull()
  })

  it('translates Prisma P2002 into a conflict error and preserves its cause', async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '7.9.0',
        meta: { modelName: 'Url', target: ['shortCode'] },
      },
    )
    prismaMock.url.create.mockRejectedValue(prismaError)

    const operation = shortenerRepository.createShortUrl({
      originalUrl: urlFixture.originalUrl,
      shortCode,
    })

    await expect(operation).rejects.toBeInstanceOf(ConflictError)
    await expect(operation).rejects.toMatchObject({
      code: 'SHORT_URL_ALREADY_EXISTS',
      cause: prismaError,
    })
  })

  it('wraps unexpected Prisma failures in a database error', async () => {
    const cause = new Error('connection refused')
    prismaMock.url.findUnique.mockRejectedValue(cause)

    const operation = shortenerRepository.findShortUrl(shortCode)

    await expect(operation).rejects.toBeInstanceOf(DatabaseError)
    await expect(operation).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      cause,
    })
  })

  it('increments one click synchronously for the benchmark baseline', async () => {
    await shortenerRepository.incrementClicks(shortCode)

    expect(prismaMock.url.update).toHaveBeenCalledWith({
      where: { shortCode },
      data: { clicks: { increment: 1 } },
    })
  })

  it('increments grouped click counts in one Prisma transaction', async () => {
    const increments = [
      { shortCode, count: 3 },
      { shortCode: 'abcdef0123456789', count: 2 },
    ]

    await shortenerRepository.incrementClicksBatch(increments)

    expect(prismaMock.url.update).toHaveBeenNthCalledWith(1, {
      where: { shortCode },
      data: { clicks: { increment: 3 } },
    })
    expect(prismaMock.url.update).toHaveBeenNthCalledWith(2, {
      where: { shortCode: 'abcdef0123456789' },
      data: { clicks: { increment: 2 } },
    })
    expect(prismaMock.$transaction).toHaveBeenCalledWith([
      prismaMock.url.update.mock.results[0].value,
      prismaMock.url.update.mock.results[1].value,
    ])
  })

  it('does not open a transaction for an empty batch', async () => {
    await shortenerRepository.incrementClicksBatch([])

    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })
})
