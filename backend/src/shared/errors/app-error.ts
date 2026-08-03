export interface ErrorDetail {
  path: string
  code: string
  message: string
}

interface AppErrorOptions {
  statusCode: number
  code: string
  title: string
  detail: string
  errors?: ErrorDetail[]
  isOperational?: boolean
  cause?: unknown
  retryAfterSeconds?: number
}

export class AppError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly title: string
  readonly detail: string
  readonly errors?: ErrorDetail[]
  readonly isOperational: boolean
  readonly retryAfterSeconds?: number

  constructor({
    statusCode,
    code,
    title,
    detail,
    errors,
    isOperational = true,
    cause,
    retryAfterSeconds,
  }: AppErrorOptions) {
    super(detail, { cause })

    this.name = new.target.name
    this.statusCode = statusCode
    this.code = code
    this.title = title
    this.detail = detail
    this.errors = errors
    this.isOperational = isOperational
    this.retryAfterSeconds = retryAfterSeconds

    Error.captureStackTrace?.(this, new.target)
  }
}
