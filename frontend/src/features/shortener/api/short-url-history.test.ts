import { beforeEach, describe, expect, it } from 'vitest'
import {
  addShortUrlToHistory,
  loadShortUrlHistory,
  saveShortUrlHistory,
} from './short-url-history'

const createdShortUrl = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  shortCode: 'aB3dE5g7',
  originalUrl: 'https://example.com/articles/a-long-path',
  createdAt: '2026-08-03T12:00:00.000Z',
  clicks: 0,
}

describe('short URL session history', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('restores a validated versioned history', () => {
    window.sessionStorage.setItem(
      'short-url-history:v1',
      JSON.stringify([createdShortUrl]),
    )

    expect(loadShortUrlHistory(window.sessionStorage)).toEqual([
      createdShortUrl,
    ])
  })

  it('discards corrupt or obsolete stored content safely', () => {
    window.sessionStorage.setItem(
      'short-url-history:v1',
      JSON.stringify([{ ...createdShortUrl, shortCode: 'legacy-code' }]),
    )

    expect(loadShortUrlHistory(window.sessionStorage)).toEqual([])
  })

  it('keeps the 20 newest results in reverse chronological order', () => {
    const history = Array.from({ length: 20 }, (_, index) => ({
      ...createdShortUrl,
      id: `123e4567-e89b-42d3-a456-${String(index).padStart(12, '0')}`,
      shortCode: `A${String(index).padStart(7, '0')}`,
    }))
    const newest = {
      ...createdShortUrl,
      id: '223e4567-e89b-42d3-a456-426614174000',
      shortCode: 'Z9y8X7w6',
    }

    const result = addShortUrlToHistory(history, newest)

    expect(result).toHaveLength(20)
    expect(result[0]).toEqual(newest)
    expect(result).not.toContainEqual(history[19])
  })

  it('does not break in-memory behavior when storage writes fail', () => {
    const unavailableStorage = {
      setItem() {
        throw new DOMException('Storage unavailable')
      },
    } as Pick<Storage, 'setItem'>

    expect(() =>
      saveShortUrlHistory([createdShortUrl], unavailableStorage),
    ).not.toThrow()
  })
})
