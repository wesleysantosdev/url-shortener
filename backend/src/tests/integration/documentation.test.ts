import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const backendDocuments = [
  'README.md',
  'DOCKER_GUIDE.md',
  'INTERVIEW_SIMULATION.md',
  'SYSTEM_DESIGN_STUDY.md',
  'ERROR_HANDLING.md',
].map((path) => readFileSync(path, 'utf8')).join('\n')
const frontendReadme = readFileSync('../frontend/README.md', 'utf8')
const reactGuidePath = '../frontend/REACT_CONCEPTS.md'

describe('delivered architecture documentation', () => {
  it('describes ID-derived Base62 and six-month inactivity cleanup', () => {
    expect(backendDocuments).toMatch(/Base62/)
    expect(backendDocuments).toMatch(/180 dias|seis meses/i)
    expect(backendDocuments).toContain('SHORT_CODE_SECRET')
    expect(backendDocuments).toContain('PUBLIC_SHORT_URL_BASE')
  })

  it('contains no commands or settings from removed runtime features', () => {
    expect(backendDocuments).not.toMatch(
      /npm run (worker|benchmark|dev:baseline|dev:optimized)|CLICK_TRACKING_MODE|CLICK_QUEUE_MAX_LENGTH|MAX_ACTIVE_URLS|URL_DELETION_GRACE_HOURS|VITE_PUBLIC_SHORT_URL_BASE/,
    )
    expect(frontendReadme).not.toContain('VITE_PUBLIC_SHORT_URL_BASE')
  })

  it('includes a Portuguese React concepts guide for the implemented UI', () => {
    expect(existsSync(reactGuidePath)).toBe(true)
    const reactGuide = existsSync(reactGuidePath)
      ? readFileSync(reactGuidePath, 'utf8')
      : ''

    expect(reactGuide).toMatch(/props/i)
    expect(reactGuide).toMatch(/estado|state/i)
    expect(reactGuide).toMatch(/hooks/i)
    expect(reactGuide).toMatch(/Context/)
    expect(reactGuide).toContain('sessionStorage')
  })
})
