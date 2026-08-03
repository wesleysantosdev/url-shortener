import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const schema = readFileSync('prisma/schema.prisma', 'utf8')

describe('Prisma governance schema', () => {
  it('stores native UUID IDs and bounded short URL fields', () => {
    expect(schema).toContain(
      'id               String    @id @default(uuid()) @db.Uuid',
    )
    expect(schema).toContain('shortCode        String    @unique @db.VarChar(8)')
    expect(schema).toContain('originalUrl      String    @db.VarChar(2048)')
  })

  it('indexes expiry and quarantine timestamps', () => {
    expect(schema).toContain('lastAccessedAt   DateTime?')
    expect(schema).toContain('expiresAt         DateTime')
    expect(schema).toContain('quarantinedAt     DateTime?')
    expect(schema).toContain('@@index([expiresAt])')
    expect(schema).toContain('@@index([quarantinedAt])')
  })

  it('defines the singleton active URL counter', () => {
    expect(schema).toContain('model UrlCapacity')
    expect(schema).toContain("key         String   @id @default(\"global\")")
    expect(schema).toContain('activeCount Int      @default(0)')
  })
})
