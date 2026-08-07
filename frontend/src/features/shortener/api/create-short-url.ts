import { z } from 'zod'
import { runtimeConfig } from '../../../shared/config/runtime-config'

export const absoluteHttpUrlSchema = z
  .url()
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol
      return protocol === 'http:' || protocol === 'https:'
    } catch {
      return false
    }
  })
  .pipe(z.string().max(2_048))

const createShortUrlResponseSchema = z.strictObject({
  shortUrl: absoluteHttpUrlSchema,
})

const problemDetailsSchema = z.object({
  type: z.literal('about:blank'),
  title: z.string(),
  status: z.number().int(),
  detail: z.string(),
  instance: z.string(),
  code: z.string(),
  errors: z
    .array(
      z.object({
        path: z.string(),
        code: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
})

export class ShortenerApiError extends Error {
  readonly code: string
  readonly status?: number
  readonly retryAfterSeconds?: number

  constructor(
    message: string,
    code: string,
    status?: number,
    retryAfterSeconds?: number,
  ) {
    super(message)
    this.name = 'ShortenerApiError'
    this.code = code
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

function invalidResponseError(): ShortenerApiError {
  return new ShortenerApiError(
    'The server returned an invalid response. Try again.',
    'INVALID_RESPONSE',
  )
}

async function readResponsePayload(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw invalidResponseError()
  }
}

function throwProblemDetails(
  payload: unknown,
  status: number,
  retryAfterSeconds?: number,
): never {
  const parsedProblem = problemDetailsSchema.safeParse(payload)

  if (parsedProblem.success) {
    throw new ShortenerApiError(
      parsedProblem.data.detail,
      parsedProblem.data.code,
      status,
      retryAfterSeconds,
    )
  }

  throw new ShortenerApiError(
    'Could not shorten this URL. Try again.',
    'REQUEST_FAILED',
    status,
  )
}

export async function createShortUrl(
  originalUrl: string,
  apiBaseUrl = runtimeConfig.apiBaseUrl,
): Promise<string> {
  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}/api/v1/shortener`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: originalUrl }),
    })
  } catch {
    throw new ShortenerApiError(
      'Could not reach the server. Check your connection and try again.',
      'NETWORK_ERROR',
    )
  }

  const payload = await readResponsePayload(response)

  if (!response.ok) {
    const rawRetryAfter = response.headers.get('Retry-After')
    const retryAfterSeconds = rawRetryAfter
      ? Number.parseInt(rawRetryAfter, 10)
      : undefined

    throwProblemDetails(
      payload,
      response.status,
      retryAfterSeconds !== undefined && retryAfterSeconds > 0
        ? retryAfterSeconds
        : undefined,
    )
  }

  const parsedResponse = createShortUrlResponseSchema.safeParse(payload)

  if (!parsedResponse.success) {
    throw invalidResponseError()
  }

  return parsedResponse.data.shortUrl
}
