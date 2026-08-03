import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CreationRateLimiter,
  RateLimitRedisClient,
} from './creation-rate-limiter'
import {
  CreationRateLimitError,
  RateLimitUnavailableError,
} from '../../shared/errors'

const redisClient: RateLimitRedisClient = {
  eval: vi.fn(),
  zrem: vi.fn(),
}

const limiter = new CreationRateLimiter(
  redisClient,
  {
    attemptLimit: 5,
    attemptWindowSeconds: 60,
    dailyLimit: 20,
    dailyWindowSeconds: 86_400,
  },
  () => 'request-id',
  () => 1_000_000,
)

describe('CreationRateLimiter', () => {
  beforeEach(() => {
    vi.mocked(redisClient.eval).mockResolvedValue([1, 4, 0])
    vi.mocked(redisClient.zrem).mockResolvedValue(1)
  })

  it('consumes one attempt in an atomic rolling window', async () => {
    await expect(limiter.consumeAttempt('ip-hash')).resolves.toEqual({
      remaining: 4,
    })

    expect(redisClient.eval).toHaveBeenCalledWith(
      expect.stringContaining('ZREMRANGEBYSCORE'),
      1,
      'creation-rate:v1:attempt:ip-hash',
      '1000000',
      '60000',
      '5',
      'request-id',
    )
  })

  it('returns the rolling retry delay when a window is full', async () => {
    vi.mocked(redisClient.eval).mockResolvedValue([0, 0, 42])

    const operation = limiter.consumeAttempt('ip-hash')

    await expect(operation).rejects.toBeInstanceOf(CreationRateLimitError)
    await expect(operation).rejects.toMatchObject({ retryAfterSeconds: 42 })
  })

  it('reserves and refunds a successful-creation slot by token', async () => {
    vi.mocked(redisClient.eval).mockResolvedValue([1, 19, 0])

    const reservation = await limiter.reserveDaily('ip-hash')
    await limiter.refundDaily(reservation)

    expect(reservation).toEqual({
      key: 'creation-rate:v1:daily:ip-hash',
      member: 'request-id',
      remaining: 19,
    })
    expect(redisClient.zrem).toHaveBeenCalledWith(
      'creation-rate:v1:daily:ip-hash',
      'request-id',
    )
  })

  it('fails closed when Redis cannot evaluate the limit', async () => {
    const cause = new Error('Redis unavailable')
    vi.mocked(redisClient.eval).mockRejectedValue(cause)

    await expect(limiter.consumeAttempt('ip-hash')).rejects.toMatchObject({
      constructor: RateLimitUnavailableError,
      cause,
    })
  })
})
