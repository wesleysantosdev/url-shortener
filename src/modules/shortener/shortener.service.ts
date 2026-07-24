import crypto from 'crypto'
import shortenerRepository from './shortener.repository'

const shortenerService = {
  async createShortUrl(url: string) {
    try {
      const shortCode = crypto.createHash('sha256').update(url).digest('hex').slice(0, 8)

      const shortUrlExists = await shortenerRepository.findShortUrl(shortCode)

      if (shortUrlExists) {
        throw new Error('Short URL already exists')
      }

      const shortUrlCreated = await shortenerRepository.createShortUrl({
        originalUrl: url,
        shortCode,
      })

      return shortUrlCreated
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(error.message)
      }

      throw new Error('Failed to create short URL')
    }
  },
}

export default shortenerService
