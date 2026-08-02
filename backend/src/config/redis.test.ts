import { expect, it, vi } from 'vitest'

const { redisInstanceMock, redisConstructorMock } = vi.hoisted(() => ({
  redisInstanceMock: {
    on: vi.fn(),
  },
  redisConstructorMock: vi.fn(),
}))

vi.mock('ioredis', () => ({
  default: class RedisMock {
    constructor(...arguments_: unknown[]) {
      redisConstructorMock(...arguments_)
      return redisInstanceMock
    }
  },
}))

vi.mock('./runtime', () => ({
  runtimeConfig: {
    redisUrl: 'redis://redis:6379',
    redisCommandTimeoutMs: 100,
  },
}))

import { redis } from './redis'

it('creates a fail-fast Redis client and handles connection errors', () => {
  expect(redisConstructorMock).toHaveBeenCalledWith('redis://redis:6379', {
    commandTimeout: 100,
    connectTimeout: 100,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: expect.any(Function),
  })
  expect(redisInstanceMock.on).toHaveBeenCalledWith(
    'error',
    expect.any(Function),
  )
  expect(redis).toBe(redisInstanceMock)

  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const now = vi
    .spyOn(Date, 'now')
    .mockReturnValueOnce(1_000)
    .mockReturnValueOnce(2_000)
    .mockReturnValueOnce(32_000)
  const errorHandler = redisInstanceMock.on.mock.calls.find(
    ([event]) => event === 'error',
  )?.[1] as (error: Error) => void

  errorHandler(new Error('first'))
  errorHandler(new Error('repeated'))
  errorHandler(new Error('after interval'))

  expect(log).toHaveBeenCalledTimes(2)
  expect(now).toHaveBeenCalledTimes(3)
})
