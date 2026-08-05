import { runtimeConfig } from '../../config/runtime'
import { NotFoundError } from '../../shared/errors'
import { ShortCodeCodec } from './short-code'
import shortenerCache from './shortener.cache'
import shortenerRepository from './shortener.repository'

const shortCodeCodec = new ShortCodeCodec(runtimeConfig.shortCodeSecret)

function shortUrlNotFound(): NotFoundError {
  return new NotFoundError('Short URL not found', 'SHORT_URL_NOT_FOUND')
}

function decodeShortCode(shortCode: string): bigint {
  try {
    return shortCodeCodec.decode(shortCode)
  } catch {
    throw shortUrlNotFound()
  }
}

async function recordClick(id: bigint, accessedAt: Date): Promise<void> {
  try {
    await shortenerRepository.recordClick(id, accessedAt)
  } catch (error: unknown) {
    console.error({
      message: 'Click tracking failed',
      error,
    })
  }
}

const shortenerService = {
  async createShortUrl(originalUrl: string): Promise<string> {
    const createdUrl = await shortenerRepository.createShortUrl(originalUrl)
    const shortCode = shortCodeCodec.encode(createdUrl.id)

    return `${runtimeConfig.publicShortUrlBase}/${shortCode}`
  },

  async resolveShortUrl(shortCode: string): Promise<string> {
    const id = decodeShortCode(shortCode)
    const cachedOriginalUrl = await shortenerCache.findOriginalUrl(shortCode)

    if (cachedOriginalUrl === null) {
      throw shortUrlNotFound()
    }

    if (cachedOriginalUrl !== undefined) {
      await recordClick(id, new Date())
      return cachedOriginalUrl
    }

    const shortUrl = await shortenerRepository.findShortUrl(id)

    if (!shortUrl) {
      await shortenerCache.storeMissingShortCode(shortCode)
      throw shortUrlNotFound()
    }

    await shortenerCache.storeOriginalUrl(shortCode, shortUrl.originalUrl)
    await recordClick(id, new Date())
    return shortUrl.originalUrl
  },
}

export default shortenerService
