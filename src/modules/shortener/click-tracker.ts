import { runtimeConfig } from '../../config/runtime'
import clickQueue from './click-queue'
import shortenerRepository from './shortener.repository'

const clickTracker = {
  track(shortCode: string): Promise<void> {
    if (runtimeConfig.clickTrackingMode === 'sync') {
      return shortenerRepository.incrementClicks(shortCode)
    }

    void clickQueue.enqueue(shortCode).catch((error: unknown) => {
      console.error({
        message:
          'Click event could not be enqueued; redirect was preserved',
        shortCode,
        error,
      })
    })

    return Promise.resolve()
  },
}

export default clickTracker
