import { beforeEach, describe, expect, it, vi } from 'vitest'

const repositoryMock = vi.hoisted(() => ({
  findDeletionCandidates: vi.fn(),
  deleteQuarantinedUrls: vi.fn(),
  findExpiryCandidates: vi.fn(),
  quarantineUrls: vi.fn(),
  reconcileCapacity: vi.fn(),
}))

const cacheMock = vi.hoisted(() => ({ invalidate: vi.fn() }))

const runtimeConfigMock = vi.hoisted(() => ({
  urlCleanupBatchSize: 1_000,
  urlDeletionGraceHours: 24,
  maxActiveUrls: 100_000,
}))

vi.mock('./shortener.repository', () => ({ default: repositoryMock }))
vi.mock('./shortener.cache', () => ({ default: cacheMock }))
vi.mock('../../config/runtime', () => ({ runtimeConfig: runtimeConfigMock }))

import urlLifecycleService from './url-lifecycle.service'

const expired = { id: 'expired-id', shortCode: 'aB3dE5g7' }
const quarantined = { id: 'quarantined-id', shortCode: 'Z9y8X7w6' }

describe('urlLifecycleService', () => {
  beforeEach(() => {
    repositoryMock.findDeletionCandidates.mockResolvedValue([])
    repositoryMock.deleteQuarantinedUrls.mockResolvedValue(0)
    repositoryMock.findExpiryCandidates.mockResolvedValue([])
    repositoryMock.quarantineUrls.mockResolvedValue(0)
    repositoryMock.reconcileCapacity.mockResolvedValue(0)
    cacheMock.invalidate.mockResolvedValue(undefined)
  })

  it('deletes completed quarantine before marking newly expired URLs', async () => {
    repositoryMock.findDeletionCandidates
      .mockResolvedValueOnce([quarantined])
      .mockResolvedValueOnce([])
    repositoryMock.deleteQuarantinedUrls.mockResolvedValueOnce(1)
    repositoryMock.findExpiryCandidates
      .mockResolvedValueOnce([expired])
      .mockResolvedValueOnce([])
    repositoryMock.quarantineUrls.mockResolvedValueOnce(1)
    repositoryMock.reconcileCapacity.mockResolvedValue(9)
    const now = new Date('2026-08-03T12:00:00.000Z')

    await expect(urlLifecycleService.runMaintenance(now)).resolves.toEqual({
      deletedCount: 1,
      quarantinedCount: 1,
      activeCount: 9,
    })
    expect(repositoryMock.findDeletionCandidates).toHaveBeenCalledWith(
      new Date('2026-08-02T12:00:00.000Z'),
      1_000,
    )
    expect(repositoryMock.deleteQuarantinedUrls).toHaveBeenCalledWith(
      ['quarantined-id'],
      new Date('2026-08-02T12:00:00.000Z'),
      now,
    )
    expect(repositoryMock.findExpiryCandidates).toHaveBeenCalledWith(now, 1_000)
    expect(repositoryMock.quarantineUrls).toHaveBeenCalledWith(
      ['expired-id'],
      now,
    )
    expect(cacheMock.invalidate).toHaveBeenNthCalledWith(1, ['Z9y8X7w6'])
    expect(cacheMock.invalidate).toHaveBeenNthCalledWith(2, ['aB3dE5g7'])
    expect(repositoryMock.reconcileCapacity).toHaveBeenCalledWith(100_000)
  })

  it('reconciles capacity even when no lifecycle candidates exist', async () => {
    repositoryMock.reconcileCapacity.mockResolvedValue(12)

    await expect(
      urlLifecycleService.runMaintenance(
        new Date('2026-08-03T12:00:00.000Z'),
      ),
    ).resolves.toEqual({
      deletedCount: 0,
      quarantinedCount: 0,
      activeCount: 12,
    })
    expect(cacheMock.invalidate).not.toHaveBeenCalled()
  })
})
