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
