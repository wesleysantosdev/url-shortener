import { Request, Response } from 'express'
import { z } from 'zod'
import { describe, expect, it, vi } from 'vitest'
import { ValidationError } from '../errors'
import { validateBody } from './validate-body.middleware'

describe('validateBody', () => {
  const schema = z.strictObject({
    name: z.string().trim().min(1),
  })

  it('replaces the request body with parsed data', () => {
    const request = { body: { name: '  Wesley  ' } } as Request
    const next = vi.fn()

    validateBody(schema)(request, {} as Response, next)

    expect(request.body).toEqual({ name: 'Wesley' })
    expect(next).toHaveBeenCalledOnce()
  })

  it('throws a validation error containing normalized issue paths', () => {
    const request = { body: { name: 42 } } as Request
    const next = vi.fn()

    expect(() => validateBody(schema)(request, {} as Response, next)).toThrowError(
      ValidationError,
    )

    try {
      validateBody(schema)(request, {} as Response, next)
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 422,
        code: 'VALIDATION_ERROR',
        errors: [
          {
            path: 'name',
            code: 'invalid_type',
          },
        ],
      })
    }
  })
})
