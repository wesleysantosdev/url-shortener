import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const backendDocuments = readFileSync('README.md', 'utf8')
const frontendReadme = readFileSync('../frontend/README.md', 'utf8')

describe('delivered architecture documentation', () => {
  it('describes ID-derived Base62 and six-month inactivity cleanup', () => {
    expect(backendDocuments).toMatch(/Base62/)
    expect(backendDocuments).toMatch(/180 (dias|days)|seis meses/i)
    expect(backendDocuments).toContain('SHORT_CODE_SECRET')
    expect(backendDocuments).toContain('PUBLIC_SHORT_URL_BASE')
  })

  it('contains no commands or settings from removed runtime features', () => {
    expect(backendDocuments).not.toMatch(
      /npm run (worker|benchmark|dev:baseline|dev:optimized)|CLICK_TRACKING_MODE|CLICK_QUEUE_MAX_LENGTH|MAX_ACTIVE_URLS|URL_DELETION_GRACE_HOURS|VITE_PUBLIC_SHORT_URL_BASE/,
    )
    expect(frontendReadme).not.toContain('VITE_PUBLIC_SHORT_URL_BASE')
  })

  it('documents the implemented React architecture in the tracked README', () => {
    expect(frontendReadme).toMatch(/props/i)
    expect(frontendReadme).toMatch(/estado|state/i)
    expect(frontendReadme).toMatch(/hooks/i)
    expect(frontendReadme).toMatch(/Context/)
    expect(frontendReadme).toContain('sessionStorage')
  })
})
