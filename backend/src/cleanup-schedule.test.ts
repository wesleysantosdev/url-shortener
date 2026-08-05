import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const lifecycleMock = vi.hoisted(() => ({ deleteInactiveUrls: vi.fn() }))

vi.mock('./modules/shortener/url-lifecycle.service', () => ({
  default: lifecycleMock,
}))
vi.mock('./config/runtime', () => ({
  runtimeConfig: { urlCleanupIntervalHours: 24 },
}))

import {
  hoursToMilliseconds,
  startCleanupSchedule,
} from './cleanup-schedule'

describe('cleanup schedule', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    lifecycleMock.deleteInactiveUrls.mockResolvedValue({ deletedCount: 0 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('converts the daily interval to milliseconds', () => {
    expect(hoursToMilliseconds(24)).toBe(86_400_000)
  })

  it('runs cleanup at startup and every configured interval', async () => {
    const timer = startCleanupSchedule()

    await vi.waitFor(() => {
      expect(lifecycleMock.deleteInactiveUrls).toHaveBeenCalledOnce()
    })
    await vi.advanceTimersByTimeAsync(86_400_000)
    expect(lifecycleMock.deleteInactiveUrls).toHaveBeenCalledTimes(2)

    clearInterval(timer)
  })

  it('logs one failed run without stopping future cleanup', async () => {
    const error = new Error('database unavailable')
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    lifecycleMock.deleteInactiveUrls
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ deletedCount: 0 })

    const timer = startCleanupSchedule()

    await vi.waitFor(() => {
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'URL cleanup failed', error }),
      )
    })
    await vi.advanceTimersByTimeAsync(86_400_000)
    expect(lifecycleMock.deleteInactiveUrls).toHaveBeenCalledTimes(2)

    clearInterval(timer)
  })
})
