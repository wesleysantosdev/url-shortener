/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const formStyles = readFileSync(
  resolve(process.cwd(), 'src/features/shortener/components/ShortenerForm.module.css'),
  'utf8',
)

describe('ShortenerForm styles', () => {
  it('does not draw a rectangular outline around the focused URL input', () => {
    expect(formStyles).toMatch(
      /\.input:focus-visible\s*{[^}]*outline:\s*(?:0|none);[^}]*}/,
    )
  })

  it('compresses the full Shorten button on hover', () => {
    expect(formStyles).toMatch(
      /\.submitButton:hover:not\(:disabled\)[^}]*{[^}]*animation:\s*buttonCompression 680ms[^}]*}/,
    )
    expect(formStyles).not.toContain('.submitButton::after')
  })

  it('disables button compression when reduced motion is preferred', () => {
    expect(formStyles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.submitButton:hover:not\(:disabled\)[\s\S]*animation:\s*none/,
    )
  })
})
