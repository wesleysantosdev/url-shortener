import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const schema = readFileSync('prisma/schema.prisma', 'utf8')

describe('Prisma URL schema', () => {
  it('stores a generated BigInt ID and bounded original URL', () => {
    expect(schema).toContain('id             BigInt   @id @default(autoincrement())')
    expect(schema).toContain('originalUrl    String   @db.VarChar(2048)')
  })

  it('stores direct click and non-null activity state', () => {
    expect(schema).toContain('clicks         Int      @default(0)')
    expect(schema).toContain('lastAccessedAt DateTime @default(now())')
    expect(schema).toContain('@@index([lastAccessedAt])')
  })

  it('does not persist a derived code, quarantine, expiry, or capacity counter', () => {
    expect(schema).not.toContain('shortCode')
    expect(schema).not.toContain('expiresAt')
    expect(schema).not.toContain('quarantinedAt')
    expect(schema).not.toContain('model UrlCapacity')
  })
})
