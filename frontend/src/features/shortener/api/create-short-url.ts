import { z } from 'zod'
import { runtimeConfig } from '../../../shared/config/runtime-config'

const absoluteHttpUrlSchema = z.url().refine((value) => {
  const protocol = new URL(value).protocol
  return protocol === 'http:' || protocol === 'https:'
})

const createdShortUrlSchema = z.object({
  id: z.string().min(1),
  shortCode: z.string().regex(/^(?:[a-f0-9]{8}|[a-f0-9]{16})$/),
  originalUrl: absoluteHttpUrlSchema,
  createdAt: z.iso.datetime(),
  clicks: z.number().int().nonnegative(),
})

const createShortUrlResponseSchema = z.object({
  message: z.string(),
  data: createdShortUrlSchema,
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

export type CreatedShortUrl = z.infer<typeof createdShortUrlSchema>

export class ShortenerApiError extends Error {
  readonly code: string
  readonly status?: number

  constructor(message: string, code: string, status?: number) {
    super(message)
    this.name = 'ShortenerApiError'
    this.code = code
    this.status = status
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

function throwProblemDetails(payload: unknown, status: number): never {
  const parsedProblem = problemDetailsSchema.safeParse(payload)

  if (parsedProblem.success) {
    throw new ShortenerApiError(
      parsedProblem.data.detail,
      parsedProblem.data.code,
      status,
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
): Promise<CreatedShortUrl> {
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
    throwProblemDetails(payload, response.status)
  }

  const parsedResponse = createShortUrlResponseSchema.safeParse(payload)

  if (!parsedResponse.success) {
    throw invalidResponseError()
  }

  return parsedResponse.data.data
}
