import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShortUrlResult } from './ShortUrlResult'

const publicShortUrl = 'https://go.example.com/aB3d'

describe('ShortUrlResult', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the shortened URL as a safe external link', () => {
    render(<ShortUrlResult shortUrl={publicShortUrl} />)

    expect(screen.getByRole('link', { name: publicShortUrl })).toHaveAttribute(
      'href',
      publicShortUrl,
    )
    expect(screen.getByRole('link', { name: 'Open link' })).toHaveAttribute(
      'rel',
      'noreferrer',
    )
  })

  it('copies the exact shortened URL and confirms the completed action', async () => {
    const user = userEvent.setup()
    const clipboardWrite = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue()
    render(<ShortUrlResult shortUrl={publicShortUrl} />)

    await user.click(screen.getByRole('button', { name: 'Copy link' }))

    expect(clipboardWrite).toHaveBeenCalledWith(publicShortUrl)
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()
  })

  it('resets the copy action after its confirmation', async () => {
    vi.useFakeTimers()
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    render(<ShortUrlResult shortUrl={publicShortUrl} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    await act(async () => {})
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()

    await act(() => vi.advanceTimersByTimeAsync(2_000))

    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
  })

  it('keeps the link selectable and directs manual copy when Clipboard fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new DOMException('Clipboard unavailable'),
    )
    render(<ShortUrlResult shortUrl={publicShortUrl} />)

    await user.click(screen.getByRole('button', { name: 'Copy link' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Copy failed. Select the link and copy it manually.',
    )
    expect(screen.getByRole('link', { name: publicShortUrl })).toBeInTheDocument()
  })
})
