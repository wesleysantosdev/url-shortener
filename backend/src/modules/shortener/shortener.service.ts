import crypto from 'crypto'
import { Url } from '../../../prisma/generated/client'
import { ConflictError, NotFoundError } from '../../shared/errors'
import clickTracker from './click-tracker'
import shortenerCache from './shortener.cache'
import shortenerRepository from './shortener.repository'

const shortenerService = {
  async createShortUrl(url: string): Promise<Url> {
    const shortCode = crypto
      .createHash('sha256')
      .update(url)
      .digest('hex')
      .slice(0, 16)

    const shortUrlExists = await shortenerRepository.findShortUrl(shortCode)

    if (shortUrlExists) {
      throw new ConflictError(
        'SHORT_URL_ALREADY_EXISTS',
        'A short URL with this code already exists',
      )
    }

    return shortenerRepository.createShortUrl({
      originalUrl: url,
      shortCode,
    })
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

    void shortenerCache.storeOriginalUrl(shortCode, shortUrl.originalUrl)
    await clickTracker.track(shortCode)

    return shortUrl.originalUrl
  },
}

export default shortenerService
