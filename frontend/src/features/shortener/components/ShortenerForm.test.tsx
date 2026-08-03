import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShortenerForm } from './ShortenerForm'

const originalUrl = 'https://example.com/articles/a-long-path'
const createdShortUrlResponse = {
  message: 'Short URL created successfully',
  data: {
    id: 'cm123456789',
    shortCode: 'abc123de456789ff',
    originalUrl,
    createdAt: '2026-08-03T12:00:00.000Z',
    clicks: 0,
  },
}

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
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
    await user.type(screen.getByRole('textbox', { name: /long url/i }), url)
  }

  await user.click(screen.getByRole('button', { name: 'Shorten' }))
}

describe('ShortenerForm', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    ['', 'Enter a URL to shorten.'],
    ['not a url', 'Enter a valid absolute URL.'],
    ['ftp://example.com/file', 'Use a URL that starts with http:// or https://.'],
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

  it('removes the previous result as soon as the original URL changes', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', successfulFetch())
    render(<ShortenerForm />)

    await enterAndSubmit(originalUrl)
    const shortLink = await screen.findByRole('link', {
      name: 'http://localhost:5000/abc123de456789ff',
    })

    await user.type(screen.getByRole('textbox', { name: /long url/i }), '?edited')

    expect(shortLink).not.toBeInTheDocument()
  })

  it('explains how to recover from a duplicate URL conflict', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse(
          {
            type: 'about:blank',
            title: 'Conflict',
            status: 409,
            detail: 'A short URL with this code already exists',
            instance: '/api/v1/shortener',
            code: 'SHORT_URL_ALREADY_EXISTS',
          },
          409,
        ),
      ),
    )
    render(<ShortenerForm />)

    await enterAndSubmit(originalUrl)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This URL has already been shortened. Try a different URL.',
    )
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
