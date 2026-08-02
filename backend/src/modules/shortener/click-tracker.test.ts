import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shortCode } from '../../tests/helpers/url.fixture'

const clickQueueMock = vi.hoisted(() => ({
  enqueue: vi.fn(),
}))

const repositoryMock = vi.hoisted(() => ({
  incrementClicks: vi.fn(),
}))

const runtimeConfigMock = vi.hoisted(() => ({
  clickTrackingMode: 'async' as 'async' | 'sync',
}))

vi.mock('./click-queue', () => ({
  default: clickQueueMock,
}))

vi.mock('./shortener.repository', () => ({
  default: repositoryMock,
}))

vi.mock('../../config/runtime', () => ({
  runtimeConfig: runtimeConfigMock,
}))

import clickTracker from './click-tracker'

describe('clickTracker', () => {
  beforeEach(() => {
    runtimeConfigMock.clickTrackingMode = 'async'
    clickQueueMock.enqueue.mockResolvedValue(undefined)
    repositoryMock.incrementClicks.mockResolvedValue(undefined)
  })

  it('returns immediately while enqueuing in async mode', async () => {
    clickQueueMock.enqueue.mockReturnValue(new Promise(() => undefined))

    await expect(clickTracker.track(shortCode)).resolves.toBeUndefined()
    expect(clickQueueMock.enqueue).toHaveBeenCalledWith(shortCode)
    expect(repositoryMock.incrementClicks).not.toHaveBeenCalled()
  })

  it('logs an enqueue failure without propagating it', async () => {
    const error = new Error('Redis unavailable')
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    clickQueueMock.enqueue.mockRejectedValue(error)

    await clickTracker.track(shortCode)
    await Promise.resolve()

    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Click event could not be enqueued; redirect was preserved',
        error,
      }),
    )
  })

  it('waits for PostgreSQL in synchronous benchmark mode', () => {
    const pendingIncrement = new Promise<void>(() => undefined)
    repositoryMock.incrementClicks.mockReturnValue(pendingIncrement)
    runtimeConfigMock.clickTrackingMode = 'sync'

    expect(clickTracker.track(shortCode)).toBe(pendingIncrement)
    expect(clickQueueMock.enqueue).not.toHaveBeenCalled()
  })
})
