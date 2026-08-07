import { beforeEach, describe, expect, it } from 'vitest'
import {
  addShortUrlToHistory,
  loadShortUrlHistory,
  saveShortUrlHistory,
} from './short-url-history'

const createdShortUrl = {
  shortUrl: 'https://sho.rt/aB3d',
  originalUrl: 'https://example.com/articles/a-long-path',
}

describe('short URL session history', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('restores a validated versioned history', () => {
    window.sessionStorage.setItem(
      'short-url-history:v2',
      JSON.stringify([createdShortUrl]),
    )

    expect(loadShortUrlHistory(window.sessionStorage)).toEqual([
      createdShortUrl,
    ])
  })

  it('discards corrupt or obsolete stored content safely', () => {
    window.sessionStorage.setItem(
      'short-url-history:v2',
      JSON.stringify([{ ...createdShortUrl, shortUrl: 'legacy-code' }]),
    )

    expect(loadShortUrlHistory(window.sessionStorage)).toEqual([])
  })

  it('keeps the five newest results in reverse chronological order', () => {
    const history = Array.from({ length: 5 }, (_, index) => ({
      ...createdShortUrl,
      shortUrl: `https://sho.rt/A${String(index).padStart(3, '0')}`,
    }))
    const newest = {
      ...createdShortUrl,
      shortUrl: 'https://sho.rt/Z9y8',
    }

    const result = addShortUrlToHistory(history, newest)

    expect(result).toHaveLength(5)
    expect(result[0]).toEqual(newest)
    expect(result).not.toContainEqual(history[4])
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
