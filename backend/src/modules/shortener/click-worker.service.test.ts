import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shortCode } from '../../tests/helpers/url.fixture'

const clickQueueMock = vi.hoisted(() => ({
  takeBatch: vi.fn(),
  requeue: vi.fn(),
}))

const repositoryMock = vi.hoisted(() => ({
  incrementClicksBatch: vi.fn(),
}))

const runtimeConfigMock = vi.hoisted(() => ({ urlRetentionDays: 30 }))

vi.mock('./click-queue', () => ({
  default: clickQueueMock,
}))

vi.mock('./shortener.repository', () => ({
  default: repositoryMock,
}))

vi.mock('../../config/runtime', () => ({ runtimeConfig: runtimeConfigMock }))

import clickWorkerService from './click-worker.service'

describe('clickWorkerService', () => {
  beforeEach(() => {
    clickQueueMock.takeBatch.mockResolvedValue([])
    clickQueueMock.requeue.mockResolvedValue(undefined)
    repositoryMock.incrementClicksBatch.mockResolvedValue(undefined)
  })

  it('does nothing when the queue is empty', async () => {
    await expect(clickWorkerService.processNextBatch(500)).resolves.toMatchObject({
      eventCount: 0,
      distinctUrlCount: 0,
    })
    expect(repositoryMock.incrementClicksBatch).not.toHaveBeenCalled()
  })

  it('groups repeated short codes before updating PostgreSQL', async () => {
    clickQueueMock.takeBatch.mockResolvedValue([
      { shortCode, accessedAt: new Date('2026-08-03T12:00:00.000Z') },
      { shortCode, accessedAt: new Date('2026-08-03T12:05:00.000Z') },
      {
        shortCode: 'Z9y8X7w6',
        accessedAt: new Date('2026-08-03T11:00:00.000Z'),
      },
    ])

    await expect(clickWorkerService.processNextBatch(500)).resolves.toMatchObject({
      eventCount: 3,
      distinctUrlCount: 2,
    })
    expect(repositoryMock.incrementClicksBatch).toHaveBeenCalledWith([
      {
        shortCode,
        count: 2,
        lastAccessedAt: new Date('2026-08-03T12:05:00.000Z'),
        expiresAt: new Date('2026-09-02T12:05:00.000Z'),
      },
      {
        shortCode: 'Z9y8X7w6',
        count: 1,
        lastAccessedAt: new Date('2026-08-03T11:00:00.000Z'),
        expiresAt: new Date('2026-09-02T11:00:00.000Z'),
      },
    ])
  })

  it('requeues the complete batch when PostgreSQL fails', async () => {
    const events = [
      { shortCode, accessedAt: new Date('2026-08-03T12:00:00.000Z') },
      {
        shortCode: 'Z9y8X7w6',
        accessedAt: new Date('2026-08-03T12:01:00.000Z'),
      },
    ]
    const error = new Error('PostgreSQL unavailable')
    clickQueueMock.takeBatch.mockResolvedValue(events)
    repositoryMock.incrementClicksBatch.mockRejectedValue(error)

    await expect(
      clickWorkerService.processNextBatch(500),
    ).rejects.toBe(error)
    expect(clickQueueMock.requeue).toHaveBeenCalledWith(events)
  })
})
