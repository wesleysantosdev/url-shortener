import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shortCode } from '../../tests/helpers/url.fixture'

const transactionMock = vi.hoisted(() => ({
  rpush: vi.fn(),
  ltrim: vi.fn(),
  exec: vi.fn(),
}))

const redisMock = vi.hoisted(() => ({
  multi: vi.fn(),
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
    transactionMock.rpush.mockReturnValue(transactionMock)
    transactionMock.ltrim.mockReturnValue(transactionMock)
    transactionMock.exec.mockResolvedValue([
      [null, 1],
      [null, 'OK'],
    ])
    redisMock.multi.mockReturnValue(transactionMock)
    redisMock.lpop.mockResolvedValue([])
    redisMock.lpush.mockResolvedValue(1)
  })

  it('appends an event and atomically limits the queue length', async () => {
    await clickQueue.enqueue(shortCode)

    expect(transactionMock.rpush).toHaveBeenCalledWith(
      'click-events',
      shortCode,
    )
    expect(transactionMock.ltrim).toHaveBeenCalledWith(
      'click-events',
      -1_000_000,
      -1,
    )
    expect(transactionMock.exec).toHaveBeenCalledOnce()
  })

  it('logs when the oldest event is discarded', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    transactionMock.exec.mockResolvedValue([
      [null, 1_000_001],
      [null, 'OK'],
    ])

    await clickQueue.enqueue(shortCode)

    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Click queue reached its limit; oldest event discarded',
      }),
    )
  })

  it('takes at most one batch from the head of the queue', async () => {
    redisMock.lpop.mockResolvedValue([shortCode, shortCode])

    await expect(clickQueue.takeBatch(500)).resolves.toEqual([
      shortCode,
      shortCode,
    ])
    expect(redisMock.lpop).toHaveBeenCalledWith('click-events', 500)
  })

  it('normalizes an empty Redis response to an empty array', async () => {
    redisMock.lpop.mockResolvedValue(null)

    await expect(clickQueue.takeBatch(500)).resolves.toEqual([])
  })

  it('puts a failed batch back at the head in its original order', async () => {
    await clickQueue.requeue(['first', 'second', 'third'])

    expect(redisMock.lpush).toHaveBeenCalledWith(
      'click-events',
      'third',
      'second',
      'first',
    )
  })
})
