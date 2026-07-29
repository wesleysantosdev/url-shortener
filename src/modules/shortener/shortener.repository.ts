import { Prisma, Url } from '../../../prisma/generated/client'
import { prisma } from '../../config/database'
import { ConflictError, DatabaseError } from '../../shared/errors'
import { CreateShortUrlData } from './shortener.type'

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
}

export default shortenerRepository
