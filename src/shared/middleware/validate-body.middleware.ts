import { RequestHandler } from 'express'
import { ZodType } from 'zod'
import { ValidationError } from '../errors'

export function validateBody(schema: ZodType): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body)

    if (!result.success) {
      throw new ValidationError(
        result.error.issues.map((issue) => ({
          path: issue.path.join('.') || 'body',
          code: issue.code,
          message: issue.message,
        })),
      )
    }

    request.body = result.data
    next()
  }
}
