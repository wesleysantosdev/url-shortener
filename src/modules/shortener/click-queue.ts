import { redis } from '../../config/redis'
import { runtimeConfig } from '../../config/runtime'

const CLICK_QUEUE_KEY = 'click-events'

const clickQueue = {
  async enqueue(shortCode: string): Promise<void> {
    const result = await redis
      .multi()
      .rpush(CLICK_QUEUE_KEY, shortCode)
      .ltrim(
        CLICK_QUEUE_KEY,
        -runtimeConfig.clickQueueMaxLength,
        -1,
      )
      .exec()

    const appendedLength = result?.[0]?.[1]

    if (
      typeof appendedLength === 'number' &&
      appendedLength > runtimeConfig.clickQueueMaxLength
    ) {
      console.warn({
        message:
          'Click queue reached its limit; oldest event discarded',
        maxLength: runtimeConfig.clickQueueMaxLength,
      })
    }
  },

  async takeBatch(batchSize: number): Promise<string[]> {
    const shortCodes = await redis.lpop(CLICK_QUEUE_KEY, batchSize)
    return shortCodes ?? []
  },

  async requeue(shortCodes: string[]): Promise<void> {
    if (shortCodes.length === 0) {
      return
    }

    await redis.lpush(CLICK_QUEUE_KEY, ...[...shortCodes].reverse())
  },
}

export default clickQueue
