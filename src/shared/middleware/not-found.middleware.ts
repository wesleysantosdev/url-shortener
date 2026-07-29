import { RequestHandler } from 'express'
import { NotFoundError } from '../errors'

export const notFound: RequestHandler = (request, _response, next) => {
  next(
    new NotFoundError(
      `Route ${request.method} ${request.originalUrl} not found`,
    ),
  )
}
