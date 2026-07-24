import { prisma } from '../../config/database'
import { CreateShortUrlData } from './shortener.type'

const shortenerRepository = {
  async createShortUrl(shortUrlData: CreateShortUrlData) {
    try {
      const data = await prisma.url.create({
        data: shortUrlData,
      })

      return data
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(error.message)
      }

      throw new Error('Failed to create short URL in the database')
    }
  },

  async findShortUrl(shortCode: string) {
    try {
      const data = await prisma.url.findUnique({
        where: { shortCode },
      })

      return data
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(error.message)
      }

      throw new Error('Failed to find short URL in the database')
    }
  },
}

export default shortenerRepository
