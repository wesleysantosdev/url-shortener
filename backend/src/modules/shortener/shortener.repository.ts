import { Prisma, Url } from '../../../prisma/generated/client'
import { prisma } from '../../config/database'
import { DatabaseError, UrlCapacityReachedError } from '../../shared/errors'
import { ShortCodeCollisionError } from './short-code'
import { capacityMonitor } from './capacity-monitor'
import {
  ClickIncrement,
  CreateShortUrlData,
} from './shortener.type'

function throwRepositoryError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    throw new ShortCodeCollisionError({ cause: error })
  }

  throw new DatabaseError(error)
}

const shortenerRepository = {
  async createShortUrlWithinCapacity(
    shortUrlData: CreateShortUrlData,
    maximumActiveUrls: number,
  ): Promise<Url> {
    try {
      const result = await prisma.$transaction(async (transaction) => {
        const reservation = await transaction.urlCapacity.updateMany({
          where: {
            key: 'global',
            activeCount: { lt: maximumActiveUrls },
          },
          data: { activeCount: { increment: 1 } },
        })

        if (reservation.count === 0) {
          throw new UrlCapacityReachedError()
        }

        const createdUrl = await transaction.url.create({
          data: shortUrlData,
        })
        const capacity = await transaction.urlCapacity.findUnique({
          where: { key: 'global' },
          select: { activeCount: true },
        })

        if (!capacity) {
          throw new Error('Global URL capacity record is missing')
        }

        return { createdUrl, activeCount: capacity.activeCount }
      })

      capacityMonitor.observe(result.activeCount, maximumActiveUrls)
      return result.createdUrl
    } catch (error: unknown) {
      if (error instanceof UrlCapacityReachedError) {
        throw error
      }

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

  recordClick(increment: ClickIncrement): Promise<void> {
    return this.incrementClicksBatch([increment])
  },

  async incrementClicksBatch(
    increments: ClickIncrement[],
  ): Promise<void> {
    if (increments.length === 0) {
      return
    }

    try {
      const updates = increments.flatMap(
        ({ shortCode, count, lastAccessedAt, expiresAt }) => [
          prisma.url.updateMany({
            where: { shortCode },
            data: { clicks: { increment: count } },
          }),
          prisma.url.updateMany({
            where: {
              shortCode,
              OR: [
                { lastAccessedAt: null },
                { lastAccessedAt: { lt: lastAccessedAt } },
              ],
            },
            data: {
              lastAccessedAt,
              expiresAt,
              quarantinedAt: null,
            },
          }),
        ],
      )

      await prisma.$transaction(updates)
    } catch (error: unknown) {
      throwRepositoryError(error)
    }
  },

  async findDeletionCandidates(cutoff: Date, batchSize: number) {
    try {
      return await prisma.url.findMany({
        where: { quarantinedAt: { lte: cutoff } },
        select: { id: true, shortCode: true },
        orderBy: { id: 'asc' },
        take: batchSize,
      })
    } catch (error: unknown) {
      throwRepositoryError(error)
    }
  },

  async deleteQuarantinedUrls(
    ids: string[],
    quarantineCutoff: Date,
    now: Date,
  ): Promise<number> {
    try {
      return await prisma.$transaction(async (transaction) => {
        const deletion = await transaction.url.deleteMany({
          where: {
            id: { in: ids },
            quarantinedAt: { lte: quarantineCutoff },
            expiresAt: { lte: now },
          },
        })
        const activeCount = await transaction.url.count()

        await transaction.urlCapacity.upsert({
          where: { key: 'global' },
          create: { key: 'global', activeCount },
          update: { activeCount },
        })

        return deletion.count
      })
    } catch (error: unknown) {
      throwRepositoryError(error)
    }
  },

  async findExpiryCandidates(now: Date, batchSize: number) {
    try {
      return await prisma.url.findMany({
        where: { expiresAt: { lte: now }, quarantinedAt: null },
        select: { id: true, shortCode: true },
        orderBy: { id: 'asc' },
        take: batchSize,
      })
    } catch (error: unknown) {
      throwRepositoryError(error)
    }
  },

  async quarantineUrls(ids: string[], now: Date): Promise<number> {
    try {
      const result = await prisma.url.updateMany({
        where: {
          id: { in: ids },
          expiresAt: { lte: now },
          quarantinedAt: null,
        },
        data: { quarantinedAt: now },
      })

      return result.count
    } catch (error: unknown) {
      throwRepositoryError(error)
    }
  },

  async reconcileCapacity(maximumActiveUrls: number): Promise<number> {
    try {
      const activeCount = await prisma.url.count()

      await prisma.urlCapacity.upsert({
        where: { key: 'global' },
        create: { key: 'global', activeCount },
        update: { activeCount },
      })

      capacityMonitor.observe(activeCount, maximumActiveUrls)
      return activeCount
    } catch (error: unknown) {
      throwRepositoryError(error)
    }
  },
}

export default shortenerRepository
