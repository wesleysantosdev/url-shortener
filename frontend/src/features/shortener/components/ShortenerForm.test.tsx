import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShortenerForm } from './ShortenerForm'

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

function successfulFetch(): ReturnType<typeof vi.fn<typeof fetch>> {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(jsonResponse(createdShortUrlResponse, 201))
}

async function enterAndSubmit(url: string) {
  const user = userEvent.setup()

  if (url !== '') {
    const input = screen.getByRole('textbox', { name: /long url/i })

    if (url.length > 500) {
      fireEvent.change(input, { target: { value: url } })
    } else {
      await user.type(input, url)
    }
  }

  await user.click(screen.getByRole('button', { name: 'Shorten' }))
}

describe('ShortenerForm', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    ['', 'Enter a URL to shorten.'],
    ['not a url', 'Enter a valid absolute URL.'],
    ['ftp://example.com/file', 'Use a URL that starts with http:// or https://.'],
    [
      `https://example.com/${'a'.repeat(2_049)}`,
      'Use a URL with at most 2048 characters.',
    ],
  ])('rejects %s before making a request', async (url, message) => {
    const fetchMock = successfulFetch()
    vi.stubGlobal('fetch', fetchMock)
    render(<ShortenerForm />)

    await enterAndSubmit(url)

    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('disables repeat submission while the request is pending', async () => {
    let resolveRequest: ((response: Response) => void) | undefined
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveRequest = resolve
    })
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockReturnValue(pendingResponse),
    )
    render(<ShortenerForm />)

    await enterAndSubmit(originalUrl)

    expect(
      screen.getByRole('button', { name: 'Shortening…' }),
    ).toBeDisabled()

    resolveRequest?.(jsonResponse(createdShortUrlResponse, 201))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Short link ready.',
    )
  })

  it('announces when a short link is ready', async () => {
    vi.stubGlobal('fetch', successfulFetch())
    render(<ShortenerForm />)

    await enterAndSubmit(originalUrl)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Short link ready.',
    )
  })

  it('keeps previous session results when the original URL changes', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', successfulFetch())
    render(<ShortenerForm />)

    await enterAndSubmit(originalUrl)
    const shortLink = await screen.findByRole('link', {
      name: 'http://localhost:5000/aB3dE5g7',
    })

    await user.type(screen.getByRole('textbox', { name: /long url/i }), '?edited')

    expect(shortLink).toBeInTheDocument()
  })

  it('adds a different shortcode when the same URL is submitted again', async () => {
    const user = userEvent.setup()
    const secondResponse = {
      ...createdShortUrlResponse,
      data: {
        ...createdShortUrlResponse.data,
        id: '223e4567-e89b-42d3-a456-426614174000',
        shortCode: 'Z9y8X7w6',
      },
    }
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse(createdShortUrlResponse, 201))
        .mockResolvedValueOnce(jsonResponse(secondResponse, 201)),
    )
    render(<ShortenerForm />)

    await enterAndSubmit(originalUrl)
    await user.click(screen.getByRole('button', { name: 'Shorten' }))

    expect(
      await screen.findByRole('link', {
        name: 'http://localhost:5000/Z9y8X7w6',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: 'http://localhost:5000/aB3dE5g7',
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(originalUrl)).toHaveLength(2)
  })

  it('restores validated results after the page reloads', () => {
    window.sessionStorage.setItem(
      'short-url-history:v1',
      JSON.stringify([createdShortUrlResponse.data]),
    )

    render(<ShortenerForm />)

    expect(
      screen.getByRole('link', {
        name: 'http://localhost:5000/aB3dE5g7',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(originalUrl)).toBeInTheDocument()
  })

  it('explains when the creation rate limit can be retried', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse(
          {
            type: 'about:blank',
            title: 'Too Many Requests',
            status: 429,
            detail: 'Too many short URL creation requests',
            instance: '/api/v1/shortener',
            code: 'CREATION_RATE_LIMIT_EXCEEDED',
          },
          429,
          { 'Retry-After': '120' },
        ),
      ),
    )
    render(<ShortenerForm />)

    await enterAndSubmit(originalUrl)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many links created. Try again in 2 minutes.',
    )
  })

  it.each([
    [
      'RATE_LIMIT_UNAVAILABLE',
      'Link creation is temporarily unavailable while abuse protection recovers. Try again shortly.',
    ],
    [
      'URL_CAPACITY_REACHED',
      'This shortener has reached its current capacity. Try again after inactive links are cleared.',
    ],
  ])('gives specific recovery guidance for %s', async (code, message) => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse(
          {
            type: 'about:blank',
            title: 'Service Unavailable',
            status: 503,
            detail: 'Short URL creation is temporarily unavailable',
            instance: '/api/v1/shortener',
            code,
          },
          503,
        ),
      ),
    )
    render(<ShortenerForm />)

    await enterAndSubmit(originalUrl)

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('shows the normalized recovery message for network failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')),
    )
    render(<ShortenerForm />)

    await enterAndSubmit(originalUrl)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the server. Check your connection and try again.',
    )
  })
})
