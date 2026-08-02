import { AppError } from './app-error'

interface BodyParserError extends SyntaxError {
  status?: number
  type?: string
}

function isMalformedJsonError(error: unknown): error is BodyParserError {
  return (
    error instanceof SyntaxError &&
    'type' in error &&
    error.type === 'entity.parse.failed' &&
    'status' in error &&
    error.status === 400
  )
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (isMalformedJsonError(error)) {
    return new AppError({
      statusCode: 400,
      code: 'INVALID_JSON',
      title: 'Bad Request',
      detail: 'The request body contains invalid JSON',
      cause: error,
    })
  }

  return new AppError({
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    title: 'Internal Server Error',
    detail: 'An unexpected error occurred',
    isOperational: false,
    cause: error,
  })
}
