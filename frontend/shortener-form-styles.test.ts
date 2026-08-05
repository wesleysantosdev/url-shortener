import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const formStyles = readFileSync(
  resolve(process.cwd(), 'src/features/shortener/components/ShortenerForm.module.css'),
  'utf8',
)

describe('ShortenerForm focus styles', () => {
  it('does not draw a rectangular outline around the focused URL input', () => {
    expect(formStyles).toMatch(
      /\.input:focus-visible\s*{[^}]*outline:\s*(?:0|none);[^}]*}/,
    )
  })
})
