import { runtimeConfig } from './config/runtime'
import urlLifecycleService from './modules/shortener/url-lifecycle.service'

/** Converts a positive hour interval to its timer delay. */
export function hoursToMilliseconds(hours: number): number {
  return hours * 60 * 60 * 1_000
}

async function runCleanup(): Promise<void> {
  try {
    const result = await urlLifecycleService.deleteInactiveUrls()

    if (result.deletedCount > 0) {
      console.log({ message: 'Inactive URLs deleted', ...result })
    }
  } catch (error: unknown) {
    console.error({ message: 'URL cleanup failed', error })
  }
}

/** Starts one immediate cleanup and repeats it for this API process. */
export function startCleanupSchedule(): NodeJS.Timeout {
  void runCleanup()
  const timer = setInterval(
    () => void runCleanup(),
    hoursToMilliseconds(runtimeConfig.urlCleanupIntervalHours),
  )

  timer.unref()
  return timer
}
