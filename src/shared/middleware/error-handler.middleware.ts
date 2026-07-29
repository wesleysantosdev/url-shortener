import { ErrorRequestHandler } from 'express'
import { AppError, normalizeError } from '../errors'

interface ProblemDetails {
  type: 'about:blank'
  title: string
  status: number
  detail: string
  instance: string
  code: string
  errors?: AppError['errors']
}

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error)
    return
  }

  const normalizedError = normalizeError(error)
  const problemDetails: ProblemDetails = {
    type: 'about:blank',
    title: normalizedError.title,
    status: normalizedError.statusCode,
    detail: normalizedError.detail,
    instance: request.originalUrl,
    code: normalizedError.code,
    ...(normalizedError.errors ? { errors: normalizedError.errors } : {}),
  }

  response
    .status(normalizedError.statusCode)
    .set('Content-Type', 'application/problem+json')
    .json(problemDetails)
}
