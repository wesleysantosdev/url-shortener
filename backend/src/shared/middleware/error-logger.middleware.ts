import { ErrorRequestHandler } from 'express'
import { normalizeError } from '../errors'

export const errorLogger: ErrorRequestHandler = (
  error,
  request,
  _response,
  next,
) => {
  const normalizedError = normalizeError(error)

  if (normalizedError.statusCode >= 500) {
    const cause = error instanceof Error ? error.cause : undefined

    console.error({
      message: 'Unhandled request error',
      request: {
        method: request.method,
        path: request.originalUrl,
      },
      error: {
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : String(error),
        code: normalizedError.code,
        stack: error instanceof Error ? error.stack : undefined,
        cause,
      },
    })
  }

  next(error)
}
