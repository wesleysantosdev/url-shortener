import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ShortenerApiError,
  createShortUrl,
} from './create-short-url'

const originalUrl = 'https://example.com/articles/a-long-path'
const createdShortUrlResponse = {
  message: 'Short URL created successfully',
  data: {
    id: '123e4567-e89b-42d3-a456-426614174000',
    shortCode: 'aB3dE5g7',
    originalUrl,
    createdAt: '2026-08-03T12:00:00.000Z',
    clicks: 0,
  },
}

function jsonResponse(
  payload: unknown,
  status: number,
  headers: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

describe('createShortUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the URL and returns the complete validated record', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(createdShortUrlResponse, 201))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      createShortUrl(originalUrl, 'https://api.example.com'),
    ).resolves.toEqual(createdShortUrlResponse.data)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/shortener',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: originalUrl }),
      },
    )
  })

  it('preserves a valid Problem Details code and detail', async () => {
    const problemDetails = {
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      detail: 'A short URL with this code already exists',
      instance: '/api/v1/shortener',
      code: 'SHORT_URL_ALREADY_EXISTS',
    }
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(problemDetails, 409)),
    )

    const request = createShortUrl(originalUrl, 'https://api.example.com')

    await expect(request).rejects.toMatchObject({
      name: 'ShortenerApiError',
      code: 'SHORT_URL_ALREADY_EXISTS',
      status: 409,
      message: problemDetails.detail,
    })
  })

  it('preserves Retry-After for a creation rate limit', async () => {
    const problemDetails = {
      type: 'about:blank',
      title: 'Too Many Requests',
      status: 429,
      detail: 'Too many short URL creation requests',
      instance: '/api/v1/shortener',
      code: 'CREATION_RATE_LIMIT_EXCEEDED',
    }
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          jsonResponse(problemDetails, 429, { 'Retry-After': '42' }),
        ),
    )

    await expect(
      createShortUrl(originalUrl, 'https://api.example.com'),
    ).rejects.toMatchObject({
      code: 'CREATION_RATE_LIMIT_EXCEEDED',
      status: 429,
      retryAfterSeconds: 42,
    })
  })

  it('rejects a successful response that does not match the backend contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse(
          {
            ...createdShortUrlResponse,
            data: { ...createdShortUrlResponse.data, shortCode: 'wrong' },
          },
          201,
        ),
      ),
    )

    await expect(
      createShortUrl(originalUrl, 'https://api.example.com'),
    ).rejects.toEqual(
      new ShortenerApiError(
        'The server returned an invalid response. Try again.',
        'INVALID_RESPONSE',
      ),
    )
  })

  it('normalizes network failures without exposing implementation details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    await expect(
      createShortUrl(originalUrl, 'https://api.example.com'),
    ).rejects.toEqual(
      new ShortenerApiError(
        'Could not reach the server. Check your connection and try again.',
        'NETWORK_ERROR',
      ),
    )
  })
})
