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
  },
}))

vi.mock('../../config/database', () => ({
  prisma: prismaMock,
}))

import shortenerRepository from './shortener.repository'

describe('shortenerRepository', () => {
  beforeEach(() => {
    prismaMock.url.create.mockResolvedValue(urlFixture)
    prismaMock.url.findUnique.mockResolvedValue(urlFixture)
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
})
