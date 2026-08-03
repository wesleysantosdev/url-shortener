import { runtimeConfig } from '../../config/runtime'
import shortenerCache from './shortener.cache'
import shortenerRepository from './shortener.repository'

interface MaintenanceResult {
  deletedCount: number
  quarantinedCount: number
  activeCount: number
}

async function deleteCompletedQuarantines(
  now: Date,
  cutoff: Date,
): Promise<number> {
  let deletedCount = 0

  while (true) {
    const candidates = await shortenerRepository.findDeletionCandidates(
      cutoff,
      runtimeConfig.urlCleanupBatchSize,
    )

    if (candidates.length === 0) {
      break
    }

    const batchCount = await shortenerRepository.deleteQuarantinedUrls(
      candidates.map(({ id }) => id),
      cutoff,
      now,
    )
    deletedCount += batchCount

    if (batchCount > 0) {
      await shortenerCache.invalidate(
        candidates.map(({ shortCode }) => shortCode),
      )
    }

    if (
      batchCount === 0 ||
      candidates.length < runtimeConfig.urlCleanupBatchSize
    ) {
      break
    }
  }

  return deletedCount
}

async function quarantineExpiredUrls(now: Date): Promise<number> {
  let quarantinedCount = 0

  while (true) {
    const candidates = await shortenerRepository.findExpiryCandidates(
      now,
      runtimeConfig.urlCleanupBatchSize,
    )

    if (candidates.length === 0) {
      break
    }

    const batchCount = await shortenerRepository.quarantineUrls(
      candidates.map(({ id }) => id),
      now,
    )
    quarantinedCount += batchCount

    if (batchCount > 0) {
      await shortenerCache.invalidate(
        candidates.map(({ shortCode }) => shortCode),
      )
    }

    if (
      batchCount === 0 ||
      candidates.length < runtimeConfig.urlCleanupBatchSize
    ) {
      break
    }
  }

  return quarantinedCount
}

const urlLifecycleService = {
  async runMaintenance(now = new Date()): Promise<MaintenanceResult> {
    const graceCutoff = new Date(
      now.getTime() -
        runtimeConfig.urlDeletionGraceHours * 60 * 60 * 1_000,
    )
    const deletedCount = await deleteCompletedQuarantines(now, graceCutoff)
    const quarantinedCount = await quarantineExpiredUrls(now)
    const activeCount = await shortenerRepository.reconcileCapacity(
      runtimeConfig.maxActiveUrls,
    )

    return { deletedCount, quarantinedCount, activeCount }
  },
}

export default urlLifecycleService
