import { randomUUID } from 'node:crypto'
import { redis } from '../../config/redis'
import { runtimeConfig } from '../../config/runtime'
import {
  CreationRateLimitError,
  RateLimitUnavailableError,
} from '../../shared/errors'

const CONSUME_ROLLING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
local count = redis.call('ZCARD', key)

if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryMilliseconds = math.max(1, tonumber(oldest[2]) + window - now)
  redis.call('PEXPIRE', key, window)
  return {0, 0, math.ceil(retryMilliseconds / 1000)}
end

redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return {1, limit - count - 1, 0}
`

export interface RateLimitRedisClient {
  eval(
    script: string,
    numberOfKeys: number,
    ...arguments_: string[]
  ): Promise<unknown>
  zrem(key: string, member: string): Promise<number>
}

interface RateLimitSettings {
  attemptLimit: number
  attemptWindowSeconds: number
  dailyLimit: number
  dailyWindowSeconds: number
}

interface DailyReservation {
  key: string
  member: string
  remaining: number
}

interface WindowResult {
  remaining: number
}

function resultTuple(result: unknown): [number, number, number] {
  if (
    !Array.isArray(result) ||
    result.length !== 3 ||
    result.some((value) => typeof value !== 'number')
  ) {
    throw new Error('Invalid Redis rolling-window response')
  }

  return result as [number, number, number]
}

export class CreationRateLimiter {
  constructor(
    private readonly redisClient: RateLimitRedisClient,
    private readonly settings: RateLimitSettings,
    private readonly createMember: () => string = randomUUID,
    private readonly now: () => number = Date.now,
  ) {}

  consumeAttempt(identity: string): Promise<WindowResult> {
    return this.consumeWindow(
      `creation-rate:v1:attempt:${identity}`,
      this.settings.attemptLimit,
      this.settings.attemptWindowSeconds,
    )
  }

  async reserveDaily(identity: string): Promise<DailyReservation> {
    const key = `creation-rate:v1:daily:${identity}`
    const member = this.createMember()
    const result = await this.consumeWindow(
      key,
      this.settings.dailyLimit,
      this.settings.dailyWindowSeconds,
      member,
    )

    return { key, member, remaining: result.remaining }
  }

  async refundDaily(reservation: DailyReservation): Promise<void> {
    try {
      await this.redisClient.zrem(reservation.key, reservation.member)
    } catch (error: unknown) {
      console.error({
        message: 'Daily creation reservation could not be refunded',
        error,
      })
    }
  }

  private async consumeWindow(
    key: string,
    limit: number,
    windowSeconds: number,
    member = this.createMember(),
  ): Promise<WindowResult> {
    let rawResult: unknown

    try {
      rawResult = await this.redisClient.eval(
        CONSUME_ROLLING_WINDOW_SCRIPT,
        1,
        key,
        String(this.now()),
        String(windowSeconds * 1_000),
        String(limit),
        member,
      )
    } catch (error: unknown) {
      throw new RateLimitUnavailableError(error)
    }

    let allowed: number
    let remaining: number
    let retryAfterSeconds: number

    try {
      ;[allowed, remaining, retryAfterSeconds] = resultTuple(rawResult)
    } catch (error: unknown) {
      throw new RateLimitUnavailableError(error)
    }

    if (allowed === 0) {
      throw new CreationRateLimitError(retryAfterSeconds)
    }

    return { remaining }
  }
}

const redisRateLimitClient: RateLimitRedisClient = {
  eval: (script, numberOfKeys, ...arguments_) =>
    redis.eval(script, numberOfKeys, ...arguments_),
  zrem: (key, member) => redis.zrem(key, member),
}

export const creationRateLimiter = new CreationRateLimiter(
  redisRateLimitClient,
  {
    attemptLimit: runtimeConfig.creationAttemptLimit,
    attemptWindowSeconds: runtimeConfig.creationAttemptWindowSeconds,
    dailyLimit: runtimeConfig.creationDailyLimit,
    dailyWindowSeconds: runtimeConfig.creationDailyWindowSeconds,
  },
)
