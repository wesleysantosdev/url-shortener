import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ShortCodeCodec } from './short-code'

const runtimeConfigMock = vi.hoisted(() => ({
  shortCodeSecret: 'test-short-code-secret-with-32-chars',
  urlRetentionDays: 180,
}))
const repositoryMock = vi.hoisted(() => ({
  findInactiveUrls: vi.fn(),
  deleteInactiveUrls: vi.fn(),
}))
const cacheMock = vi.hoisted(() => ({ invalidate: vi.fn() }))

vi.mock('./shortener.repository', () => ({ default: repositoryMock }))
vi.mock('./shortener.cache', () => ({ default: cacheMock }))
vi.mock('../../config/runtime', () => ({ runtimeConfig: runtimeConfigMock }))

import urlLifecycleService from './url-lifecycle.service'

describe('urlLifecycleService', () => {
  beforeEach(() => {
    repositoryMock.findInactiveUrls.mockResolvedValue([])
    repositoryMock.deleteInactiveUrls.mockResolvedValue(0)
    cacheMock.invalidate.mockResolvedValue(undefined)
  })

  it('deletes six-month inactive URLs in batches and invalidates their codes', async () => {
    const now = new Date('2026-08-04T12:00:00.000Z')
    const cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1_000)
    const codec = new ShortCodeCodec(runtimeConfigMock.shortCodeSecret)
    repositoryMock.findInactiveUrls
      .mockResolvedValueOnce([{ id: 1n }, { id: 2n }])
      .mockResolvedValueOnce([])
    repositoryMock.deleteInactiveUrls.mockResolvedValueOnce(2)

    await expect(urlLifecycleService.deleteInactiveUrls(now)).resolves.toEqual({
      deletedCount: 2,
    })

    expect(repositoryMock.findInactiveUrls).toHaveBeenNthCalledWith(
      1,
      cutoff,
      1_000,
    )
    expect(repositoryMock.deleteInactiveUrls).toHaveBeenCalledWith(
      [1n, 2n],
      cutoff,
    )
    expect(cacheMock.invalidate).toHaveBeenCalledWith([
      codec.encode(1n),
      codec.encode(2n),
    ])
  })

  it('does not delete a URL at the exact cutoff through the repository contract', async () => {
    const now = new Date('2026-08-04T12:00:00.000Z')

    await urlLifecycleService.deleteInactiveUrls(now)

    expect(repositoryMock.findInactiveUrls).toHaveBeenCalledWith(
      new Date(now.getTime() - 180 * 24 * 60 * 60 * 1_000),
      1_000,
    )
  })

  it('stops when a concurrent click protects every selected candidate', async () => {
    repositoryMock.findInactiveUrls.mockResolvedValue([{ id: 1n }])
    repositoryMock.deleteInactiveUrls.mockResolvedValue(0)

    await expect(urlLifecycleService.deleteInactiveUrls()).resolves.toEqual({
      deletedCount: 0,
    })
    expect(repositoryMock.findInactiveUrls).toHaveBeenCalledOnce()
    expect(cacheMock.invalidate).not.toHaveBeenCalled()
  })
})
