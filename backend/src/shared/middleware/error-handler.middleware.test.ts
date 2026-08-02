import { NextFunction, Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'
import { errorHandler } from './error-handler.middleware'

describe('errorHandler', () => {
  it('delegates to the Express default handler after headers were sent', () => {
    const error = new Error('stream failed')
    const response = { headersSent: true } as Response
    const next = vi.fn() as NextFunction

    errorHandler(error, {} as Request, response, next)

    expect(next).toHaveBeenCalledWith(error)
  })
})
