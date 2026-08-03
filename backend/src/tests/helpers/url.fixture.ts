import { Url } from '../../../prisma/generated/client'

export const originalUrl = 'https://example.com'
export const shortCode = 'aB3dE5g7'

export const urlFixture: Url = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  originalUrl,
  shortCode,
  createdAt: new Date('2026-07-28T12:00:00.000Z'),
  clicks: 0,
  lastAccessedAt: null,
  expiresAt: new Date('2026-08-27T12:00:00.000Z'),
  quarantinedAt: null,
}
