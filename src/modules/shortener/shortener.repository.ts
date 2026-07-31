import { Prisma, Url } from '../../../prisma/generated/client'
import { prisma } from '../../config/database'
import { ConflictError, DatabaseError } from '../../shared/errors'
import {
  ClickIncrement,
  CreateShortUrlData,
} from './shortener.type'

function throwRepositoryError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    throw new ConflictError(
      'SHORT_URL_ALREADY_EXISTS',
      'A short URL with this code already exists',
      error,
    )
  }

  throw new DatabaseError(error)
}

const shortenerRepository = {
  async createShortUrl(shortUrlData: CreateShortUrlData): Promise<Url> {
    try {
      return await prisma.url.create({
        data: shortUrlData,
      })
    } catch (error: unknown) {
      throwRepositoryError(error)
    }
  },

  async findShortUrl(shortCode: string): Promise<Url | null> {
    try {
      return await prisma.url.findUnique({
        where: { shortCode },
      })
    } catch (error: unknown) {
      throwRepositoryError(error)
    }
  },

  async incrementClicks(shortCode: string): Promise<void> {
    try {
      await prisma.url.update({
        where: { shortCode },
        data: { clicks: { increment: 1 } },
      })
    } catch (error: unknown) {
      throwRepositoryError(error)
    }
  },

  async incrementClicksBatch(
    increments: ClickIncrement[],
  ): Promise<void> {
    if (increments.length === 0) {
      return
    }

    try {
      const updates = increments.map(({ shortCode, count }) =>
        prisma.url.update({
          where: { shortCode },
          data: { clicks: { increment: count } },
        }),
      )

      await prisma.$transaction(updates)
    } catch (error: unknown) {
      throwRepositoryError(error)
    }
  },
}

export default shortenerRepository
