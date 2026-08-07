import { Url } from '../../../prisma/generated/client'
import { prisma } from '../../config/database'
import { DatabaseError } from '../../shared/errors'

function throwRepositoryError(error: unknown): never {
  throw new DatabaseError(error)
}

const shortenerRepository = {
  async createShortUrl(originalUrl: string): Promise<Url> {
    try {
      return await prisma.url.create({ data: { originalUrl } })
    } catch (error: unknown) {
      throwRepositoryError(error)
    }
  },

  async findShortUrl(id: bigint): Promise<Url | null> {
    try {
      return await prisma.url.findUnique({ where: { id } })
    } catch (error: unknown) {
      throwRepositoryError(error)
    }
  },

  async recordClick(id: bigint, accessedAt: Date): Promise<void> {
    try {
      await prisma.url.updateMany({
        where: { id },
        data: {
          clicks: { increment: 1 },
          lastAccessedAt: accessedAt,
        },
      })
    } catch (error: unknown) {
      throwRepositoryError(error)
    }
  },

  async findInactiveUrls(
    cutoff: Date,
    batchSize: number,
  ): Promise<Array<{ id: bigint }>> {
    try {
      return await prisma.url.findMany({
        where: { lastAccessedAt: { lt: cutoff } },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: batchSize,
      })
    } catch (error: unknown) {
      throwRepositoryError(error)
    }
  },

  async deleteInactiveUrls(ids: bigint[], cutoff: Date): Promise<number> {
    try {
      const result = await prisma.url.deleteMany({
        where: {
          id: { in: ids },
          lastAccessedAt: { lt: cutoff },
        },
      })

      return result.count
    } catch (error: unknown) {
      throwRepositoryError(error)
    }
  },
}

export default shortenerRepository
