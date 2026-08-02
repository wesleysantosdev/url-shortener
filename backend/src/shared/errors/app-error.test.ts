import { describe, expect, it } from 'vitest'
import { AppError } from './app-error'

describe('AppError', () => {
  it('preserves the public contract and the original cause', () => {
    const cause = new Error('database connection refused')
    const errors = [
      {
        path: 'url',
        code: 'invalid_format',
        message: 'URL must use HTTP or HTTPS',
      },
    ]

    const error = new AppError({
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      title: 'Unprocessable Content',
      detail: 'Request validation failed',
      errors,
      cause,
    })

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('AppError')
    expect(error.message).toBe('Request validation failed')
    expect(error.statusCode).toBe(422)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.title).toBe('Unprocessable Content')
    expect(error.detail).toBe('Request validation failed')
    expect(error.errors).toEqual(errors)
    expect(error.isOperational).toBe(true)
    expect(error.cause).toBe(cause)
  })
})
