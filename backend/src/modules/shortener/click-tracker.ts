import { runtimeConfig } from '../../config/runtime'
import clickQueue from './click-queue'
import shortenerRepository from './shortener.repository'

const clickTracker = {
  track(shortCode: string, accessedAt = new Date()): Promise<void> {
    const clickIncrement = {
      shortCode,
      count: 1,
      lastAccessedAt: accessedAt,
      expiresAt: new Date(
        accessedAt.getTime() +
          runtimeConfig.urlRetentionDays * 24 * 60 * 60 * 1_000,
      ),
    }

    if (runtimeConfig.clickTrackingMode === 'sync') {
      return shortenerRepository.recordClick(clickIncrement)
    }

    return this.trackAsynchronously(clickIncrement)
  },

  async trackAsynchronously(clickIncrement: {
    shortCode: string
    count: number
    lastAccessedAt: Date
    expiresAt: Date
  }): Promise<void> {
    try {
      const enqueued = await clickQueue.enqueue({
        shortCode: clickIncrement.shortCode,
        accessedAt: clickIncrement.lastAccessedAt,
      })

      if (enqueued) {
        return
      }
    } catch {
      // PostgreSQL is the durability fallback for queue failures.
    }

    try {
      await shortenerRepository.recordClick(clickIncrement)
    } catch (error: unknown) {
      console.error({
        message: 'Click activity could not be persisted; redirect was preserved',
        shortCode: clickIncrement.shortCode,
        error,
      })
    }
  },
}

export default clickTracker
