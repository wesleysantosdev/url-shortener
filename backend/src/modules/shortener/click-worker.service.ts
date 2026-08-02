import clickQueue from './click-queue'
import shortenerRepository from './shortener.repository'
import { ClickIncrement } from './shortener.type'

interface BatchResult {
  eventCount: number
  distinctUrlCount: number
  durationMs: number
}

const clickWorkerService = {
  async processNextBatch(batchSize: number): Promise<BatchResult> {
    const startedAt = performance.now()
    const events = await clickQueue.takeBatch(batchSize)

    if (events.length === 0) {
      return {
        eventCount: 0,
        distinctUrlCount: 0,
        durationMs: performance.now() - startedAt,
      }
    }

    const counts = new Map<string, number>()

    for (const shortCode of events) {
      counts.set(shortCode, (counts.get(shortCode) ?? 0) + 1)
    }

    const increments: ClickIncrement[] = Array.from(
      counts,
      ([shortCode, count]) => ({ shortCode, count }),
    )

    try {
      await shortenerRepository.incrementClicksBatch(increments)
    } catch (error: unknown) {
      await clickQueue.requeue(events)
      throw error
    }

    return {
      eventCount: events.length,
      distinctUrlCount: counts.size,
      durationMs: performance.now() - startedAt,
    }
  },
}

export default clickWorkerService
