import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repositoryRoot = resolve(process.cwd(), '..')

function repositoryFile(path: string): string {
  const absolutePath = resolve(repositoryRoot, path)

  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : ''
}

function composeService(compose: string, serviceName: string): string {
  const lines = compose.split('\n')
  const start = lines.findIndex((line) => line === `  ${serviceName}:`)

  if (start === -1) {
    return ''
  }

  const followingLines = lines.slice(start + 1)
  const relativeEnd = followingLines.findIndex(
    (line) => /^  [a-z][a-z0-9-]*:$/.test(line) || /^[a-z]/.test(line),
  )
  const end = relativeEnd === -1 ? lines.length : start + 1 + relativeEnd

  return lines.slice(start, end).join('\n')
}

describe('production deployment', () => {
  const compose = repositoryFile('docker-compose.production.yml')
  const database = composeService(compose, 'database')
  const redis = composeService(compose, 'redis')
  const api = composeService(compose, 'api')
  const web = composeService(compose, 'web')

  it('publishes the database only on the VPS loopback for SSH tunnels', () => {
    expect(database).toContain('"127.0.0.1:15432:5432"')
    expect(database).not.toContain('"0.0.0.0:15432:5432"')
    expect(database).not.toContain('- "5432:5432"')
    expect(database).toMatch(/networks:\n\s+private:\n\s+dbeaver:/)
    expect(compose).toMatch(/networks:\n(?:.|\n)*\n  dbeaver:\n/)
    expect(redis).not.toContain('ports:')
    expect(api).not.toContain('ports:')
    expect(web).toContain('"80:80"')
    expect(web).toContain('"443:443"')
  })

  it('keeps stateful services private and persistent', () => {
    expect(database).toContain('postgres-data:/var/lib/postgresql/data')
    expect(redis).toContain('redis-data:/data')
    expect(database).toContain('private:')
    expect(redis).toContain('private:')
    expect(compose).toMatch(/private:\n\s+internal: true/)
  })

  it('requires production secrets instead of embedding credentials', () => {
    expect(compose).not.toContain('12345')
    expect(compose).toContain('${POSTGRES_PASSWORD:?')
    expect(compose).toContain('${REDIS_PASSWORD:?')
    expect(compose).toContain('${RATE_LIMIT_IP_HASH_SECRET:?')
    expect(compose).toContain('${SHORT_CODE_SECRET:?')
  })

  it('runs the API behind exactly one trusted reverse proxy', () => {
    expect(api).toContain('TRUST_PROXY_HOPS: 1')
    expect(api).toContain('npx prisma migrate deploy')
    expect(web).toContain('api:')
  })

  it('builds and serves the frontend through Caddy', () => {
    const dockerfile = repositoryFile('frontend/Dockerfile')
    const caddyfile = repositoryFile('frontend/Caddyfile')

    expect(dockerfile).toContain('FROM node:24-alpine AS build')
    expect(dockerfile).toContain('FROM caddy:2-alpine')
    expect(dockerfile).toContain('npm run build')
    expect(caddyfile).toContain('reverse_proxy api:5000')
    expect(caddyfile).toContain('^/[0-9A-Za-z]{4,6}$')
    expect(caddyfile).toContain('try_files {path} /index.html')
  })

  it('keeps local production notes and the environment template untracked', () => {
    const gitignore = repositoryFile('.gitignore')
    const workflow = repositoryFile('.github/workflows/ci-cd.yml')

    expect(gitignore).toMatch(/^\.env\.production\.example$/m)
    expect(gitignore).toMatch(/^DEPLOYMENT\.md$/m)
    expect(gitignore).not.toContain('!.env.production.example')
    expect(workflow).not.toContain("--include='.env.production.example'")
  })

  it('provides a restorable scheduled PostgreSQL backup', () => {
    const backupScript = repositoryFile('ops/backup-postgres.sh')
    const backupTimer = repositoryFile('ops/shrten-backup.timer')

    expect(backupScript).toContain('pg_dump')
    expect(backupScript).toContain('--format=custom')
    expect(backupScript).toContain('RETENTION_DAYS')
    expect(backupTimer).toContain('OnCalendar=')
    expect(backupTimer).toContain('Persistent=true')
  })

  it('validates main and deploys only an approved main commit', () => {
    const workflow = repositoryFile('.github/workflows/ci-cd.yml')
    const deployScript = repositoryFile('ops/deploy.sh')

    expect(workflow).toContain('pull_request:')
    expect(workflow).toContain('push:')
    expect(workflow).toMatch(/branches:\s*\[main\]/)
    expect(workflow).toContain('npm test')
    expect(workflow).toContain('npm run typecheck')
    expect(workflow).toContain('npm run lint')
    expect(workflow).toContain('npx prisma generate')
    expect(workflow).toContain(
      'DATABASE_URL: postgresql://ci:ci@127.0.0.1:5432/ci',
    )
    expect(workflow).toContain("github.ref == 'refs/heads/main'")
    expect(workflow).toContain('needs: validate')
    expect(workflow).toContain('environment: production')
    expect(workflow).toContain('secrets.VPS_SSH_PRIVATE_KEY')
    expect(workflow).toContain('secrets.VPS_KNOWN_HOSTS')
    expect(workflow).toContain("--exclude='.env.*'")
    expect(workflow).toContain('ops/backup-postgres.sh')
    expect(workflow).toContain('ops/deploy.sh')
    expect(workflow).not.toContain('appleboy/')
    expect(deployScript).toContain('docker compose')
    expect(deployScript).toContain('up -d --build --remove-orphans')
  })
})
