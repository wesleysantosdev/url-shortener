import { describe, expect, it } from 'vitest'
import {
  createShortUrlBodySchema,
  shortCodeSchema,
} from './shortener.schema'

describe('shortener schemas', () => {
  it('accepts an original URL with exactly 2,048 characters', () => {
    const prefix = 'https://example.com/'
    const url = `${prefix}${'a'.repeat(2_048 - prefix.length)}`

    expect(createShortUrlBodySchema.safeParse({ url }).success).toBe(true)
  })

  it('rejects an original URL longer than 2,048 characters', () => {
    const prefix = 'https://example.com/'
    const url = `${prefix}${'a'.repeat(2_049 - prefix.length)}`

    const result = createShortUrlBodySchema.safeParse({ url })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(
      'URL must contain at most 2048 characters',
    )
  })

  it.each(['aB3dE5g7', '00000000', 'ZZZZZZZZ'])(
    'accepts an eight-character Base62 short code (%s)',
    (shortCode) => {
      expect(shortCodeSchema.safeParse(shortCode).success).toBe(true)
    },
  )

  it.each(['abcdef0', 'abcdef0123456789', 'abcd-123', 'ábcdef12'])(
    'rejects a non-contract short code (%s)',
    (shortCode) => {
      expect(shortCodeSchema.safeParse(shortCode).success).toBe(false)
    },
  )
})
