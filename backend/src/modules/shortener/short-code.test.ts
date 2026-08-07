import { describe, expect, it } from 'vitest'
import {
  SHORT_CODE_CAPACITY,
  ShortCodeCodec,
} from './short-code'

const secret = 'short-code-secret-with-at-least-32-characters'
const expectedCapacity = 62n ** 6n

describe('ShortCodeCodec', () => {
  it('exposes the complete six-character Base62 namespace', () => {
    expect(SHORT_CODE_CAPACITY).toBe(expectedCapacity)
  })

  it.each([1n, 2n, 62n ** 4n, 62n ** 5n, expectedCapacity])(
    'round-trips database ID %s through canonical Base62',
    (id) => {
      const codec = new ShortCodeCodec(secret)
      const shortCode = codec.encode(id)

      expect(shortCode).toMatch(/^[0-9A-Za-z]{4,6}$/)
      expect(codec.decode(shortCode)).toBe(id)
    },
  )

  it('is deterministic for one secret and changes the mapping for another', () => {
    const firstCodec = new ShortCodeCodec(secret)
    const sameCodec = new ShortCodeCodec(secret)
    const otherCodec = new ShortCodeCodec(
      'another-short-code-secret-with-32-characters',
    )
    const ids = [1n, 2n, 3n, 10_000n]

    expect(ids.map((id) => firstCodec.encode(id))).toEqual(
      ids.map((id) => sameCodec.encode(id)),
    )
    expect(ids.map((id) => firstCodec.encode(id))).not.toEqual(
      ids.map((id) => otherCodec.encode(id)),
    )
  })

  it.each([0n, expectedCapacity + 1n])(
    'rejects database ID %s outside the six-character namespace',
    (id) => {
      expect(() => new ShortCodeCodec(secret).encode(id)).toThrow(
        /between 1 and 56800235584/,
      )
    },
  )

  it.each(['abc', 'abcdefg', 'ab-c', 'á123', '00000'])(
    'rejects invalid or non-canonical shortcode %s',
    (shortCode) => {
      expect(() => new ShortCodeCodec(secret).decode(shortCode)).toThrow(
        /shortcode/i,
      )
    },
  )

  it('accepts the canonical four-character representation at numeric zero', () => {
    const codec = new ShortCodeCodec(secret)
    const id = codec.decode('0000')

    expect(codec.encode(id)).toBe('0000')
  })
})
