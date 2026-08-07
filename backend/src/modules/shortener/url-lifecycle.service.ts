import { runtimeConfig } from '../../config/runtime'
import { ShortCodeCodec } from './short-code'
import shortenerCache from './shortener.cache'
import shortenerRepository from './shortener.repository'

const CLEANUP_BATCH_SIZE = 1_000
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1_000
const shortCodeCodec = new ShortCodeCodec(runtimeConfig.shortCodeSecret)

const urlLifecycleService = {
  async deleteInactiveUrls(now = new Date()): Promise<{ deletedCount: number }> {
    const cutoff = new Date(
      now.getTime() - runtimeConfig.urlRetentionDays * DAY_IN_MILLISECONDS,
    )
    let deletedCount = 0

    while (true) {
      const candidates = await shortenerRepository.findInactiveUrls(
        cutoff,
        CLEANUP_BATCH_SIZE,
      )

      if (candidates.length === 0) {
        break
      }

      const ids = candidates.map(({ id }) => id)
      const batchDeletedCount = await shortenerRepository.deleteInactiveUrls(
        ids,
        cutoff,
      )

      if (batchDeletedCount === 0) {
        break
      }

      deletedCount += batchDeletedCount
      await shortenerCache.invalidate(ids.map((id) => shortCodeCodec.encode(id)))
    }

    return { deletedCount }
  },
}

export default urlLifecycleService
