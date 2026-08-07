import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DatabaseError } from '../../shared/errors'
import { originalUrl, urlFixture } from '../../tests/helpers/url.fixture'

const prismaMock = vi.hoisted(() => ({
  url: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('../../config/database', () => ({ prisma: prismaMock }))

import shortenerRepository from './shortener.repository'

describe('shortenerRepository', () => {
  beforeEach(() => {
    prismaMock.url.create.mockResolvedValue(urlFixture)
    prismaMock.url.findUnique.mockResolvedValue(urlFixture)
    prismaMock.url.findMany.mockResolvedValue([])
    prismaMock.url.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.url.deleteMany.mockResolvedValue({ count: 0 })
  })

  it('creates one URL and lets PostgreSQL assign its numeric ID', async () => {
    await expect(shortenerRepository.createShortUrl(originalUrl)).resolves.toBe(
      urlFixture,
    )

    expect(prismaMock.url.create).toHaveBeenCalledOnce()
    expect(prismaMock.url.create).toHaveBeenCalledWith({
      data: { originalUrl },
    })
    expect(prismaMock.url.findUnique).not.toHaveBeenCalled()
  })

  it('finds a URL directly by its decoded primary key', async () => {
    await expect(shortenerRepository.findShortUrl(42n)).resolves.toBe(urlFixture)

    expect(prismaMock.url.findUnique).toHaveBeenCalledWith({
      where: { id: 42n },
    })
  })

  it('records a click and the latest activity in one direct update', async () => {
    const accessedAt = new Date('2026-08-04T12:00:00.000Z')

    await shortenerRepository.recordClick(42n, accessedAt)

    expect(prismaMock.url.updateMany).toHaveBeenCalledWith({
      where: { id: 42n },
      data: {
        clicks: { increment: 1 },
        lastAccessedAt: accessedAt,
      },
    })
  })

  it('wraps unexpected Prisma failures in a database error', async () => {
    const cause = new Error('connection refused')
    prismaMock.url.findUnique.mockRejectedValue(cause)

    const operation = shortenerRepository.findShortUrl(42n)

    await expect(operation).rejects.toBeInstanceOf(DatabaseError)
    await expect(operation).rejects.toMatchObject({ cause })
  })

  it('finds inactive IDs in deterministic bounded batches', async () => {
    const cutoff = new Date('2026-02-05T12:00:00.000Z')
    prismaMock.url.findMany.mockResolvedValue([{ id: 1n }, { id: 2n }])

    await expect(
      shortenerRepository.findInactiveUrls(cutoff, 1_000),
    ).resolves.toEqual([{ id: 1n }, { id: 2n }])
    expect(prismaMock.url.findMany).toHaveBeenCalledWith({
      where: { lastAccessedAt: { lt: cutoff } },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: 1_000,
    })
  })

  it('deletes only IDs that remain inactive at the guarded cutoff', async () => {
    const cutoff = new Date('2026-02-05T12:00:00.000Z')
    prismaMock.url.deleteMany.mockResolvedValue({ count: 2 })

    await expect(
      shortenerRepository.deleteInactiveUrls([1n, 2n], cutoff),
    ).resolves.toBe(2)
    expect(prismaMock.url.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: [1n, 2n] },
        lastAccessedAt: { lt: cutoff },
      },
    })
  })
})
