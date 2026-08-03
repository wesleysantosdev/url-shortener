import { prisma } from './config/database'
import { redis } from './config/redis'
import { runtimeConfig } from './config/runtime'
import clickWorkerService from './modules/shortener/click-worker.service'
import urlLifecycleService from './modules/shortener/url-lifecycle.service'
import { hoursToMilliseconds } from './worker-schedule'

let isStopping = false
let timer: NodeJS.Timeout | undefined
let maintenanceTimer: NodeJS.Timeout | undefined
let currentBatch: Promise<void> = Promise.resolve()
let currentMaintenance: Promise<void> = Promise.resolve()

async function processBatch(): Promise<void> {
  try {
    const result = await clickWorkerService.processNextBatch(
      runtimeConfig.clickBatchSize,
    )

    if (result.eventCount > 0) {
      console.log({
        message: 'Click batch processed',
        ...result,
      })
    }
  } catch (error: unknown) {
    console.error({
      message: 'Click batch failed; event requeue was attempted',
      error,
    })
  }
}

async function processMaintenance(): Promise<void> {
  try {
    const result = await urlLifecycleService.runMaintenance()
    console.log({ message: 'URL lifecycle maintenance completed', ...result })
  } catch (error: unknown) {
    console.error({ message: 'URL lifecycle maintenance failed', error })
  }
}

function scheduleNextBatch(): void {
  if (isStopping) {
    return
  }

  timer = setTimeout(() => {
    currentBatch = processBatch().finally(scheduleNextBatch)
  }, runtimeConfig.clickBatchIntervalMs)
}

function scheduleNextMaintenance(): void {
  if (isStopping) {
    return
  }

  maintenanceTimer = setTimeout(() => {
    currentMaintenance = processMaintenance().finally(
      scheduleNextMaintenance,
    )
  }, hoursToMilliseconds(runtimeConfig.urlCleanupIntervalHours))
}

async function shutdown(signal: string): Promise<void> {
  if (isStopping) {
    return
  }

  isStopping = true

  if (timer) {
    clearTimeout(timer)
  }

  if (maintenanceTimer) {
    clearTimeout(maintenanceTimer)
  }

  console.log({ message: 'Stopping click worker', signal })
  await Promise.all([currentBatch, currentMaintenance])
  await Promise.allSettled([prisma.$disconnect(), redis.quit()])
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void shutdown(signal).finally(() => process.exit(0))
  })
}

console.log({
  message: 'Click worker started',
  batchSize: runtimeConfig.clickBatchSize,
  intervalMs: runtimeConfig.clickBatchIntervalMs,
  cleanupIntervalHours: runtimeConfig.urlCleanupIntervalHours,
})

scheduleNextBatch()
currentMaintenance = processMaintenance().finally(scheduleNextMaintenance)
