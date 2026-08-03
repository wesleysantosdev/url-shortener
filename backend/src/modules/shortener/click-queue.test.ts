import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shortCode } from '../../tests/helpers/url.fixture'

const redisMock = vi.hoisted(() => ({
  eval: vi.fn(),
  lpop: vi.fn(),
  lpush: vi.fn(),
}))

const runtimeConfigMock = vi.hoisted(() => ({
  clickQueueMaxLength: 1_000_000,
}))

vi.mock('../../config/redis', () => ({
  redis: redisMock,
}))

vi.mock('../../config/runtime', () => ({
  runtimeConfig: runtimeConfigMock,
}))

import clickQueue from './click-queue'

describe('clickQueue', () => {
  beforeEach(() => {
    redisMock.eval.mockResolvedValue(1)
    redisMock.lpop.mockResolvedValue([])
    redisMock.lpush.mockResolvedValue(1)
  })

  it('appends a timestamped event only when queue capacity is available', async () => {
    const event = {
      shortCode,
      accessedAt: new Date('2026-08-03T12:00:00.000Z'),
    }

    await expect(clickQueue.enqueue(event)).resolves.toBe(true)

    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('LLEN'"),
      1,
      'click-events',
      '1000000',
      JSON.stringify({
        shortCode,
        accessedAt: '2026-08-03T12:00:00.000Z',
      }),
    )
  })

  it('reports a full queue without discarding an older event', async () => {
    redisMock.eval.mockResolvedValue(0)

    await expect(
      clickQueue.enqueue({ shortCode, accessedAt: new Date() }),
    ).resolves.toBe(false)
  })

  it('takes and parses timestamped events from the queue head', async () => {
    redisMock.lpop.mockResolvedValue([
      JSON.stringify({
        shortCode,
        accessedAt: '2026-08-03T12:00:00.000Z',
      }),
    ])

    await expect(clickQueue.takeBatch(500)).resolves.toEqual([
      {
        shortCode,
        accessedAt: new Date('2026-08-03T12:00:00.000Z'),
      },
    ])
    expect(redisMock.lpop).toHaveBeenCalledWith('click-events', 500)
  })

  it('normalizes an empty Redis response to an empty array', async () => {
    redisMock.lpop.mockResolvedValue(null)

    await expect(clickQueue.takeBatch(500)).resolves.toEqual([])
  })

  it('puts a failed batch back at the head in its original order', async () => {
    const first = {
      shortCode,
      accessedAt: new Date('2026-08-03T12:00:00.000Z'),
    }
    const second = {
      shortCode: 'Z9y8X7w6',
      accessedAt: new Date('2026-08-03T12:01:00.000Z'),
    }

    await clickQueue.requeue([first, second])

    expect(redisMock.lpush).toHaveBeenCalledWith(
      'click-events',
      JSON.stringify({
        shortCode: second.shortCode,
        accessedAt: second.accessedAt.toISOString(),
      }),
      JSON.stringify({
        shortCode: first.shortCode,
        accessedAt: first.accessedAt.toISOString(),
      }),
    )
  })
})
