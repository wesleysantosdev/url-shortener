import { NextFunction, Request, Response } from 'express'
import { runtimeConfig } from '../../config/runtime'
import { RateLimitUnavailableError } from '../../shared/errors'
import { creationRateLimiter } from './creation-rate-limiter'
import { anonymizeIp } from './ip-identity'

export async function creationAttemptRateLimit(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const identity = anonymizeIp(
      request.ip ?? request.socket.remoteAddress ?? '',
      runtimeConfig.rateLimitIpHashSecret,
    )
    const result = await creationRateLimiter.consumeAttempt(identity)

    response.locals.creationRateLimitIdentity = identity
    response.set({
      'RateLimit-Limit': String(runtimeConfig.creationAttemptLimit),
      'RateLimit-Remaining': String(result.remaining),
    })
    next()
  } catch (error: unknown) {
    next(
      error instanceof RateLimitUnavailableError ||
        (typeof error === 'object' &&
          error !== null &&
          'statusCode' in error)
        ? error
        : new RateLimitUnavailableError(error),
    )
  }
}
