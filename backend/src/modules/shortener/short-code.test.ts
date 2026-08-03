import { describe, expect, it } from 'vitest'
import { generateShortCode } from './short-code'

describe('generateShortCode', () => {
  it('maps random indexes to an eight-character Base62 code', () => {
    const indexes = [0, 9, 10, 35, 36, 61, 1, 60]

    const shortCode = generateShortCode(() => indexes.shift() ?? 0)

    expect(shortCode).toBe('09AZaz1y')
  })

  it('requests exactly eight indexes from the 62-character alphabet', () => {
    const requestedMaximums: number[] = []

    generateShortCode((maximum) => {
      requestedMaximums.push(maximum)
      return 0
    })

    expect(requestedMaximums).toEqual(Array(8).fill(62))
  })
})
