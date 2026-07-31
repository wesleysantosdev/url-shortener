import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shortCode } from '../../tests/helpers/url.fixture'

const clickQueueMock = vi.hoisted(() => ({
  takeBatch: vi.fn(),
  requeue: vi.fn(),
}))

const repositoryMock = vi.hoisted(() => ({
  incrementClicksBatch: vi.fn(),
}))

vi.mock('./click-queue', () => ({
  default: clickQueueMock,
}))

vi.mock('./shortener.repository', () => ({
  default: repositoryMock,
}))

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
      shortCode,
      shortCode,
      'abcdef0123456789',
    ])

    await expect(clickWorkerService.processNextBatch(500)).resolves.toMatchObject({
      eventCount: 3,
      distinctUrlCount: 2,
    })
    expect(repositoryMock.incrementClicksBatch).toHaveBeenCalledWith([
      { shortCode, count: 2 },
      { shortCode: 'abcdef0123456789', count: 1 },
    ])
  })

  it('requeues the complete batch when PostgreSQL fails', async () => {
    const events = [shortCode, 'abcdef0123456789']
    const error = new Error('PostgreSQL unavailable')
    clickQueueMock.takeBatch.mockResolvedValue(events)
    repositoryMock.incrementClicksBatch.mockRejectedValue(error)

    await expect(
      clickWorkerService.processNextBatch(500),
    ).rejects.toBe(error)
    expect(clickQueueMock.requeue).toHaveBeenCalledWith(events)
  })
})
