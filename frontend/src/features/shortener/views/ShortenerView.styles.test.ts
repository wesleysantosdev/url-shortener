/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const viewStyles = readFileSync(
  resolve(process.cwd(), 'src/features/shortener/views/ShortenerView.module.css'),
  'utf8',
)

describe('ShortenerView styles', () => {
  it('compresses the full title phrase on a five-second cycle', () => {
    expect(viewStyles).toMatch(
      /\.titleLine\s*{[^}]*animation:\s*phraseCompression 5s[^}]*}/,
    )
    expect(viewStyles).toContain('@keyframes phraseCompression')
    expect(viewStyles).not.toContain('.titleLine::after')
  })

  it('disables phrase compression when reduced motion is preferred', () => {
    expect(viewStyles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.titleLine[\s\S]*animation:\s*none/,
    )
  })
})
