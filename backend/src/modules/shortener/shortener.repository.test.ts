import { Prisma } from '../../../prisma/generated/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DatabaseError, UrlCapacityReachedError } from '../../shared/errors'
import {
  shortCode,
  urlFixture,
} from '../../tests/helpers/url.fixture'

const prismaMock = vi.hoisted(() => ({
  url: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  urlCapacity: {
    updateMany: vi.fn(),
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}))

const capacityMonitorMock = vi.hoisted(() => ({ observe: vi.fn() }))

vi.mock('../../config/database', () => ({
  prisma: prismaMock,
}))

vi.mock('./capacity-monitor', () => ({
  capacityMonitor: capacityMonitorMock,
}))

import shortenerRepository from './shortener.repository'
import { ShortCodeCollisionError } from './short-code'

describe('shortenerRepository', () => {
  beforeEach(() => {
    prismaMock.url.create.mockResolvedValue(urlFixture)
    prismaMock.url.findUnique.mockResolvedValue(urlFixture)
    prismaMock.url.update.mockResolvedValue(urlFixture)
    prismaMock.url.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.url.findMany.mockResolvedValue([])
    prismaMock.url.deleteMany.mockResolvedValue({ count: 0 })
    prismaMock.url.count.mockResolvedValue(0)
    prismaMock.urlCapacity.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.urlCapacity.upsert.mockResolvedValue({
      key: 'global',
      activeCount: 0,
    })
    prismaMock.urlCapacity.findUnique.mockResolvedValue({ activeCount: 1 })
    prismaMock.$transaction.mockImplementation(
      async (operation: unknown) =>
        typeof operation === 'function'
          ? operation(prismaMock)
          : Promise.resolve([]),
    )
  })

  it('increments capacity and creates the URL in one transaction', async () => {
    const data = {
      originalUrl: urlFixture.originalUrl,
      shortCode: urlFixture.shortCode,
      expiresAt: urlFixture.expiresAt,
    }

    await expect(
      shortenerRepository.createShortUrlWithinCapacity(data, 100_000),
    ).resolves.toBe(urlFixture)
    expect(prismaMock.urlCapacity.updateMany).toHaveBeenCalledWith({
      where: { key: 'global', activeCount: { lt: 100_000 } },
      data: { activeCount: { increment: 1 } },
    })
    expect(prismaMock.url.create).toHaveBeenCalledWith({ data })
    expect(capacityMonitorMock.observe).toHaveBeenCalledWith(1, 100_000)
  })

  it('rejects creation without inserting when capacity is full', async () => {
    prismaMock.urlCapacity.updateMany.mockResolvedValue({ count: 0 })

    const operation = shortenerRepository.createShortUrlWithinCapacity(
      {
        originalUrl: urlFixture.originalUrl,
        shortCode,
        expiresAt: urlFixture.expiresAt,
      },
      100_000,
    )

    await expect(operation).rejects.toBeInstanceOf(UrlCapacityReachedError)
    expect(prismaMock.url.create).not.toHaveBeenCalled()
  })

  it('returns null when the short code does not exist', async () => {
    prismaMock.url.findUnique.mockResolvedValue(null)

    await expect(shortenerRepository.findShortUrl(shortCode)).resolves.toBeNull()
  })

  it('translates Prisma P2002 into an internal short-code collision', async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '7.9.0',
        meta: { modelName: 'Url', target: ['shortCode'] },
      },
    )
    prismaMock.url.create.mockRejectedValue(prismaError)

    const operation = shortenerRepository.createShortUrlWithinCapacity(
      {
        originalUrl: urlFixture.originalUrl,
        shortCode,
        expiresAt: urlFixture.expiresAt,
      },
      100_000,
    )

    await expect(operation).rejects.toBeInstanceOf(ShortCodeCollisionError)
    await expect(operation).rejects.toMatchObject({ cause: prismaError })
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

  it('records one click and extends activity synchronously', async () => {
    const increment = {
      shortCode,
      count: 1,
      lastAccessedAt: new Date('2026-08-03T12:00:00.000Z'),
      expiresAt: new Date('2026-09-02T12:00:00.000Z'),
    }

    await shortenerRepository.recordClick(increment)

    expect(prismaMock.url.updateMany).toHaveBeenNthCalledWith(1, {
      where: { shortCode },
      data: { clicks: { increment: 1 } },
    })
    expect(prismaMock.url.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        shortCode,
        OR: [
          { lastAccessedAt: null },
          { lastAccessedAt: { lt: increment.lastAccessedAt } },
        ],
      },
      data: {
        lastAccessedAt: increment.lastAccessedAt,
        expiresAt: increment.expiresAt,
        quarantinedAt: null,
      },
    })
  })

  it('increments grouped click counts in one Prisma transaction', async () => {
    const increments = [
      {
        shortCode,
        count: 3,
        lastAccessedAt: new Date('2026-08-03T12:00:00.000Z'),
        expiresAt: new Date('2026-09-02T12:00:00.000Z'),
      },
      {
        shortCode: 'Z9y8X7w6',
        count: 2,
        lastAccessedAt: new Date('2026-08-03T12:05:00.000Z'),
        expiresAt: new Date('2026-09-02T12:05:00.000Z'),
      },
    ]

    await shortenerRepository.incrementClicksBatch(increments)

    expect(prismaMock.url.updateMany).toHaveBeenNthCalledWith(1, {
      where: { shortCode },
      data: { clicks: { increment: 3 } },
    })
    expect(prismaMock.url.updateMany).toHaveBeenNthCalledWith(3, {
      where: { shortCode: 'Z9y8X7w6' },
      data: { clicks: { increment: 2 } },
    })
    expect(prismaMock.$transaction).toHaveBeenCalledWith([
      ...prismaMock.url.updateMany.mock.results.map((result) => result.value),
    ])
  })

  it('does not open a transaction for an empty batch', async () => {
    await shortenerRepository.incrementClicksBatch([])

    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('finds only completed quarantine candidates in deterministic batches', async () => {
    const cutoff = new Date('2026-08-02T12:00:00.000Z')
    prismaMock.url.findMany.mockResolvedValue([
      { id: urlFixture.id, shortCode },
    ])

    await expect(
      shortenerRepository.findDeletionCandidates(cutoff, 1_000),
    ).resolves.toEqual([{ id: urlFixture.id, shortCode }])
    expect(prismaMock.url.findMany).toHaveBeenCalledWith({
      where: { quarantinedAt: { lte: cutoff } },
      select: { id: true, shortCode: true },
      orderBy: { id: 'asc' },
      take: 1_000,
    })
  })

  it('deletes still-inactive quarantines and synchronizes capacity atomically', async () => {
    const cutoff = new Date('2026-08-02T12:00:00.000Z')
    const now = new Date('2026-08-03T12:00:00.000Z')
    prismaMock.url.deleteMany.mockResolvedValue({ count: 1 })
    prismaMock.url.count.mockResolvedValue(9)

    await expect(
      shortenerRepository.deleteQuarantinedUrls(
        [urlFixture.id],
        cutoff,
        now,
      ),
    ).resolves.toBe(1)
    expect(prismaMock.url.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: [urlFixture.id] },
        quarantinedAt: { lte: cutoff },
        expiresAt: { lte: now },
      },
    })
    expect(prismaMock.urlCapacity.upsert).toHaveBeenCalledWith({
      where: { key: 'global' },
      create: { key: 'global', activeCount: 9 },
      update: { activeCount: 9 },
    })
  })

  it('marks only currently expired, unquarantined URLs', async () => {
    const now = new Date('2026-08-03T12:00:00.000Z')

    await expect(
      shortenerRepository.quarantineUrls([urlFixture.id], now),
    ).resolves.toBe(1)
    expect(prismaMock.url.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: [urlFixture.id] },
        expiresAt: { lte: now },
        quarantinedAt: null,
      },
      data: { quarantinedAt: now },
    })
  })

  it('finds only unquarantined URLs whose expiry has passed', async () => {
    const now = new Date('2026-08-03T12:00:00.000Z')

    await shortenerRepository.findExpiryCandidates(now, 1_000)

    expect(prismaMock.url.findMany).toHaveBeenCalledWith({
      where: { expiresAt: { lte: now }, quarantinedAt: null },
      select: { id: true, shortCode: true },
      orderBy: { id: 'asc' },
      take: 1_000,
    })
  })

  it('reconciles the singleton counter with the actual URL count', async () => {
    prismaMock.url.count.mockResolvedValue(12)

    await expect(
      shortenerRepository.reconcileCapacity(100_000),
    ).resolves.toBe(12)
    expect(prismaMock.urlCapacity.upsert).toHaveBeenCalledWith({
      where: { key: 'global' },
      create: { key: 'global', activeCount: 12 },
      update: { activeCount: 12 },
    })
    expect(capacityMonitorMock.observe).toHaveBeenCalledWith(12, 100_000)
  })
})
