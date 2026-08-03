import clickQueue from './click-queue'
import shortenerRepository from './shortener.repository'
import { ClickIncrement } from './shortener.type'
import { runtimeConfig } from '../../config/runtime'

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

    const counts = new Map<
      string,
      { count: number; lastAccessedAt: Date }
    >()

    for (const event of events) {
      const current = counts.get(event.shortCode)

      counts.set(event.shortCode, {
        count: (current?.count ?? 0) + 1,
        lastAccessedAt:
          !current || event.accessedAt > current.lastAccessedAt
            ? event.accessedAt
            : current.lastAccessedAt,
      })
    }

    const increments: ClickIncrement[] = Array.from(
      counts,
      ([shortCode, { count, lastAccessedAt }]) => ({
        shortCode,
        count,
        lastAccessedAt,
        expiresAt: new Date(
          lastAccessedAt.getTime() +
            runtimeConfig.urlRetentionDays * 24 * 60 * 60 * 1_000,
        ),
      }),
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
