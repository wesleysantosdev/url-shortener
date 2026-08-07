/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const historyStyles = readFileSync(
  resolve(
    process.cwd(),
    'src/features/shortener/components/ShortUrlHistory.module.css',
  ),
  'utf8',
)

describe('ShortUrlHistory styles', () => {
  it('separates the session links heading from its notice', () => {
    expect(historyStyles).toMatch(
      /\.heading\s*{[^}]*margin:\s*0 0 0\.6rem;[^}]*}/,
    )
  })
})
