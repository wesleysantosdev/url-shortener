import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shortCode } from '../../tests/helpers/url.fixture'

const clickQueueMock = vi.hoisted(() => ({
  enqueue: vi.fn(),
}))

const repositoryMock = vi.hoisted(() => ({
  recordClick: vi.fn(),
}))

const runtimeConfigMock = vi.hoisted(() => ({
  clickTrackingMode: 'async' as 'async' | 'sync',
  urlRetentionDays: 30,
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
    clickQueueMock.enqueue.mockResolvedValue(true)
    repositoryMock.recordClick.mockResolvedValue(undefined)
  })

  it('waits until the timestamped event is accepted in async mode', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T12:00:00.000Z'))
    let acceptEvent: ((accepted: boolean) => void) | undefined
    clickQueueMock.enqueue.mockReturnValue(
      new Promise<boolean>((resolve) => {
        acceptEvent = resolve
      }),
    )
    let completed = false

    const tracking = clickTracker.track(shortCode).then(() => {
      completed = true
    })
    await Promise.resolve()

    expect(completed).toBe(false)
    expect(clickQueueMock.enqueue).toHaveBeenCalledWith({
      shortCode,
      accessedAt: new Date('2026-08-03T12:00:00.000Z'),
    })

    acceptEvent?.(true)
    await tracking
    vi.useRealTimers()
  })

  it('persists activity synchronously when the queue is full', async () => {
    clickQueueMock.enqueue.mockResolvedValue(false)

    await clickTracker.track(
      shortCode,
      new Date('2026-08-03T12:00:00.000Z'),
    )

    expect(repositoryMock.recordClick).toHaveBeenCalledWith({
      shortCode,
      count: 1,
      lastAccessedAt: new Date('2026-08-03T12:00:00.000Z'),
      expiresAt: new Date('2026-09-02T12:00:00.000Z'),
    })
  })

  it('persists activity synchronously when enqueue fails', async () => {
    const error = new Error('Redis unavailable')
    clickQueueMock.enqueue.mockRejectedValue(error)

    await clickTracker.track(
      shortCode,
      new Date('2026-08-03T12:00:00.000Z'),
    )

    expect(repositoryMock.recordClick).toHaveBeenCalledWith(
      expect.objectContaining({ shortCode, count: 1 }),
    )
  })

  it('preserves the redirect if both queue and fallback persistence fail', async () => {
    const error = new Error('Redis unavailable')
    const fallbackError = new Error('PostgreSQL unavailable')
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    clickQueueMock.enqueue.mockRejectedValue(error)
    repositoryMock.recordClick.mockRejectedValue(fallbackError)

    await expect(clickTracker.track(shortCode)).resolves.toBeUndefined()
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Click activity could not be persisted; redirect was preserved',
        error: fallbackError,
      }),
    )
  })

  it('waits for PostgreSQL in synchronous benchmark mode', () => {
    const pendingIncrement = new Promise<void>(() => undefined)
    repositoryMock.recordClick.mockReturnValue(pendingIncrement)
    runtimeConfigMock.clickTrackingMode = 'sync'

    expect(clickTracker.track(shortCode)).toBe(pendingIncrement)
    expect(clickQueueMock.enqueue).not.toHaveBeenCalled()
  })
})
