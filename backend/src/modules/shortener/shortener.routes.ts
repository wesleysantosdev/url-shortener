import { Router } from 'express'
import { validateBody } from '../../shared/middleware'
import shortenerController from './shortener.controller'
import { createShortUrlBodySchema } from './shortener.schema'
import { creationAttemptRateLimit } from './creation-rate-limit.middleware'

const shortenerRoutes = Router()

shortenerRoutes.post(
  '/v1/shortener',
  creationAttemptRateLimit,
  validateBody(createShortUrlBodySchema),
  shortenerController.createShortUrl,
)

export default shortenerRoutes
