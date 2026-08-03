import { Url } from '../../../prisma/generated/client'
import { runtimeConfig } from '../../config/runtime'
import { NotFoundError, ShortCodeGenerationError } from '../../shared/errors'
import clickTracker from './click-tracker'
import {
  generateShortCode,
  ShortCodeCollisionError,
} from './short-code'
import shortenerCache from './shortener.cache'
import shortenerRepository from './shortener.repository'

const shortenerService = {
  async createShortUrl(url: string): Promise<Url> {
    const expiresAt = new Date(
      Date.now() + runtimeConfig.urlRetentionDays * 24 * 60 * 60 * 1_000,
    )

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await shortenerRepository.createShortUrlWithinCapacity(
          {
            originalUrl: url,
            shortCode: generateShortCode(),
            expiresAt,
          },
          runtimeConfig.maxActiveUrls,
        )
      } catch (error: unknown) {
        if (!(error instanceof ShortCodeCollisionError)) {
          throw error
        }

        if (attempt === 4) {
          throw new ShortCodeGenerationError(error)
        }
      }
    }

    throw new ShortCodeGenerationError()
  },

  async resolveShortUrl(shortCode: string): Promise<string> {
    const cachedOriginalUrl = await shortenerCache.findOriginalUrl(shortCode)

    if (cachedOriginalUrl === null) {
      throw new NotFoundError('Short URL not found', 'SHORT_URL_NOT_FOUND')
    }

    if (cachedOriginalUrl !== undefined) {
      await clickTracker.track(shortCode)
      return cachedOriginalUrl
    }

    const shortUrl = await shortenerRepository.findShortUrl(shortCode)

    if (!shortUrl) {
      void shortenerCache.storeMissingShortCode(shortCode)
      throw new NotFoundError('Short URL not found', 'SHORT_URL_NOT_FOUND')
    }

    if (shortUrl.quarantinedAt) {
      const lastAccessedAt = new Date()
      await shortenerRepository.recordClick({
        shortCode,
        count: 1,
        lastAccessedAt,
        expiresAt: new Date(
          lastAccessedAt.getTime() +
            runtimeConfig.urlRetentionDays * 24 * 60 * 60 * 1_000,
        ),
      })
      void shortenerCache.storeOriginalUrl(shortCode, shortUrl.originalUrl)
      return shortUrl.originalUrl
    }

    void shortenerCache.storeOriginalUrl(shortCode, shortUrl.originalUrl)
    await clickTracker.track(shortCode)

    return shortUrl.originalUrl
  },
}

export default shortenerService
