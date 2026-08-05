import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const compose = readFileSync('docker-compose.yml', 'utf8')
const dockerfile = readFileSync('Dockerfile', 'utf8')
const environmentExample = readFileSync('.env.example', 'utf8')
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts: Record<string, string>
  devDependencies: Record<string, string>
}

describe('minimal backend runtime files', () => {
  it('keeps only database, Redis, and API services', () => {
    expect(compose).toContain('  shortener-db:')
    expect(compose).toContain('  redis:')
    expect(compose).toContain('  api:')
    expect(compose).not.toMatch(/^  (migrate|worker|benchmark):/m)
    expect(compose).not.toContain('profiles:')
  })

  it('deploys migrations before starting the API', () => {
    expect(compose).toContain('npx prisma migrate deploy')
    expect(compose).toContain('node dist/src/server.js')
  })

  it('contains no performance or worker build/package entry points', () => {
    expect(dockerfile).not.toContain(' AS tools')
    expect(dockerfile).not.toContain('COPY scripts')
    expect(packageJson.scripts).not.toHaveProperty('benchmark')
    expect(packageJson.scripts).not.toHaveProperty('worker')
    expect(packageJson.scripts).not.toHaveProperty('start:worker')
    expect(packageJson.scripts).not.toHaveProperty('dev:baseline')
    expect(packageJson.scripts).not.toHaveProperty('dev:optimized')
    expect(packageJson.devDependencies).not.toHaveProperty('autocannon')
    expect(packageJson.devDependencies).not.toHaveProperty('@types/autocannon')
  })

  it('documents only environment values consumed by the simplified runtime', () => {
    expect(environmentExample).toContain('PUBLIC_SHORT_URL_BASE=')
    expect(environmentExample).toContain('SHORT_CODE_SECRET=')
    expect(environmentExample).toContain('URL_RETENTION_DAYS=180')
    expect(environmentExample).not.toMatch(
      /CACHE_ENABLED|CLICK_TRACKING|CLICK_BATCH|CLICK_QUEUE|MAX_ACTIVE_URLS|URL_DELETION_GRACE|URL_CLEANUP_BATCH|BENCHMARK_/,
    )
  })
})
