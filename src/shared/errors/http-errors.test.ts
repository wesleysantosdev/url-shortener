import { describe, expect, it } from 'vitest'
import {
  ConflictError,
  DatabaseError,
  NotFoundError,
  ValidationError,
} from './http-errors'

describe('HTTP application errors', () => {
  it('creates a validation error with field details', () => {
    const issues = [
      {
        path: 'url',
        code: 'invalid_format',
        message: 'URL must use HTTP or HTTPS',
      },
    ]

    const error = new ValidationError(issues)

    expect(error.statusCode).toBe(422)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.errors).toEqual(issues)
  })

  it('creates a reusable conflict error', () => {
    const cause = new Error('unique constraint')
    const error = new ConflictError(
      'SHORT_URL_ALREADY_EXISTS',
      'A short URL with this code already exists',
      cause,
    )

    expect(error.statusCode).toBe(409)
    expect(error.code).toBe('SHORT_URL_ALREADY_EXISTS')
    expect(error.cause).toBe(cause)
  })

  it('creates a route not found error', () => {
    const error = new NotFoundError('Route POST /missing not found')

    expect(error.statusCode).toBe(404)
    expect(error.code).toBe('ROUTE_NOT_FOUND')
    expect(error.detail).toBe('Route POST /missing not found')
  })

  it('marks database errors as unexpected and preserves their cause', () => {
    const cause = new Error('connection refused')
    const error = new DatabaseError(cause)

    expect(error.statusCode).toBe(500)
    expect(error.code).toBe('INTERNAL_SERVER_ERROR')
    expect(error.detail).toBe('An unexpected error occurred')
    expect(error.isOperational).toBe(false)
    expect(error.cause).toBe(cause)
  })
})
