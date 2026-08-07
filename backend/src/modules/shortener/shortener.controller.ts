import { Request, Response } from 'express'
import { NotFoundError } from '../../shared/errors'
import {
  CreateShortUrlBody,
  shortCodeSchema,
} from './shortener.schema'
import shortenerService from './shortener.service'
import { creationRateLimiter } from './creation-rate-limiter'

const shortenerController = {
  async createShortUrl(
    request: Request<object, object, CreateShortUrlBody>,
    response: Response,
  ): Promise<Response> {
    const { url } = request.body
    const identity: unknown = response.locals.creationRateLimitIdentity

    if (typeof identity !== 'string') {
      throw new Error('Creation rate-limit identity is missing')
    }

    const reservation = await creationRateLimiter.reserveDaily(identity)
    let shortUrl

    try {
      shortUrl = await shortenerService.createShortUrl(url)
    } catch (error: unknown) {
      await creationRateLimiter.refundDaily(reservation)
      throw error
    }

    return response.status(201).json({ shortUrl })
  },

  async redirectToOriginalUrl(
    request: Request<{ shortCode: string }>,
    response: Response,
  ): Promise<void> {
    if (!shortCodeSchema.safeParse(request.params.shortCode).success) {
      throw new NotFoundError(
        'Short URL not found',
        'SHORT_URL_NOT_FOUND',
      )
    }

    const originalUrl = await shortenerService.resolveShortUrl(
      request.params.shortCode,
    )

    response.set('Cache-Control', 'no-store')
    response.redirect(302, originalUrl)
  },
}

export default shortenerController
