import { Router } from 'express'
import { validateBody } from '../../shared/middleware'
import shortenerController from './shortener.controller'
import { createShortUrlBodySchema } from './shortener.schema'

const shortenerRoutes = Router()

shortenerRoutes.post(
  '/v1/shortener',
  validateBody(createShortUrlBodySchema),
  shortenerController.createShortUrl,
)

export default shortenerRoutes
