import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ShortUrlResult } from './ShortUrlResult'

const shortCode = 'aB3dE5g7'
const publicShortUrl = `https://go.example.com/${shortCode}`

describe('ShortUrlResult', () => {
  it('renders the shortened URL as a safe external link', () => {
    render(
      <ShortUrlResult
        shortCode={shortCode}
        publicShortUrlBase="https://go.example.com"
      />,
    )

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
    render(
      <ShortUrlResult
        shortCode={shortCode}
        publicShortUrlBase="https://go.example.com"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Copy link' }))

    expect(clipboardWrite).toHaveBeenCalledWith(publicShortUrl)
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('keeps the link selectable and directs manual copy when Clipboard fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new DOMException('Clipboard unavailable'),
    )
    render(
      <ShortUrlResult
        shortCode={shortCode}
        publicShortUrlBase="https://go.example.com"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Copy link' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Copy failed. Select the link and copy it manually.',
    )
    expect(screen.getByRole('link', { name: publicShortUrl })).toBeInTheDocument()
  })
})
