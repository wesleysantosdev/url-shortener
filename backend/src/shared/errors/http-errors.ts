import { AppError, ErrorDetail } from './app-error'

export class ValidationError extends AppError {
  constructor(errors: ErrorDetail[]) {
    super({
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      title: 'Unprocessable Content',
      detail: 'Request validation failed',
      errors,
    })
  }
}

export class ConflictError extends AppError {
  constructor(code: string, detail: string, cause?: unknown) {
    super({
      statusCode: 409,
      code,
      title: 'Conflict',
      detail,
      cause,
    })
  }
}

export class NotFoundError extends AppError {
  constructor(detail: string, code = 'ROUTE_NOT_FOUND') {
    super({
      statusCode: 404,
      code,
      title: 'Not Found',
      detail,
    })
  }
}

export class DatabaseError extends AppError {
  constructor(cause: unknown) {
    super({
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      title: 'Internal Server Error',
      detail: 'An unexpected error occurred',
      isOperational: false,
      cause,
    })
  }
}

export class CreationRateLimitError extends AppError {
  constructor(retryAfterSeconds: number) {
    super({
      statusCode: 429,
      code: 'CREATION_RATE_LIMIT_EXCEEDED',
      title: 'Too Many Requests',
      detail: 'Too many short URL creation requests',
      retryAfterSeconds,
    })
  }
}

export class RateLimitUnavailableError extends AppError {
  constructor(cause?: unknown) {
    super({
      statusCode: 503,
      code: 'RATE_LIMIT_UNAVAILABLE',
      title: 'Service Unavailable',
      detail: 'Short URL creation is temporarily unavailable',
      cause,
    })
  }
}
