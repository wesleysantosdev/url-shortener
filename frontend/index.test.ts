import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

describe('browser icons', () => {
  it.each([
    ['icon', '/src/assets/favicon.ico'],
    ['icon', '/src/assets/favicon-32x32.png'],
    ['icon', '/src/assets/favicon-192x192.png'],
    ['icon', '/src/assets/favicon-512x512.png'],
    ['apple-touch-icon', '/src/assets/apple-touch-icon.png'],
  ])('links the %s asset %s', (relationship, assetPath) => {
    expect(indexHtml).toContain(`rel="${relationship}"`)
    expect(indexHtml).toContain(`href="${assetPath}"`)
  })
})
