import crypto from 'crypto'
import { Url } from '../../../prisma/generated/client'
import { ConflictError } from '../../shared/errors'
import shortenerRepository from './shortener.repository'

const shortenerService = {
  async createShortUrl(url: string): Promise<Url> {
    const shortCode = crypto.createHash('sha256').update(url).digest('hex').slice(0, 8)

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
}

export default shortenerService
