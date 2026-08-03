import { redis } from '../../config/redis'
import { runtimeConfig } from '../../config/runtime'
import { ClickEvent } from './shortener.type'

const CLICK_QUEUE_KEY = 'click-events'
const ENQUEUE_IF_CAPACITY_SCRIPT = `
if redis.call('LLEN', KEYS[1]) >= tonumber(ARGV[1]) then
  return 0
end

redis.call('RPUSH', KEYS[1], ARGV[2])
return 1
`

function serialize(event: ClickEvent): string {
  return JSON.stringify({
    shortCode: event.shortCode,
    accessedAt: event.accessedAt.toISOString(),
  })
}

function deserialize(rawEvent: string): ClickEvent | undefined {
  try {
    const event: unknown = JSON.parse(rawEvent)

    if (
      typeof event !== 'object' ||
      event === null ||
      !('shortCode' in event) ||
      !('accessedAt' in event) ||
      typeof event.shortCode !== 'string' ||
      !/^[0-9A-Za-z]{8}$/.test(event.shortCode) ||
      typeof event.accessedAt !== 'string'
    ) {
      return undefined
    }

    const accessedAt = new Date(event.accessedAt)

    if (Number.isNaN(accessedAt.getTime())) {
      return undefined
    }

    return { shortCode: event.shortCode, accessedAt }
  } catch {
    return undefined
  }
}

const clickQueue = {
  async enqueue(event: ClickEvent): Promise<boolean> {
    const result = await redis.eval(
      ENQUEUE_IF_CAPACITY_SCRIPT,
      1,
      CLICK_QUEUE_KEY,
      String(runtimeConfig.clickQueueMaxLength),
      serialize(event),
    )

    return result === 1
  },

  async takeBatch(batchSize: number): Promise<ClickEvent[]> {
    const rawEvents = await redis.lpop(CLICK_QUEUE_KEY, batchSize)
    const events: ClickEvent[] = []

    for (const rawEvent of rawEvents ?? []) {
      const event = deserialize(rawEvent)

      if (event) {
        events.push(event)
      } else {
        console.warn({ message: 'Invalid click event discarded' })
      }
    }

    return events
  },

  async requeue(events: ClickEvent[]): Promise<void> {
    if (events.length === 0) {
      return
    }

    await redis.lpush(
      CLICK_QUEUE_KEY,
      ...[...events].reverse().map(serialize),
    )
  },
}

export default clickQueue
