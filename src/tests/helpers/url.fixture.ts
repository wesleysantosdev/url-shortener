import { Url } from '../../../prisma/generated/client'

export const originalUrl = 'https://example.com'
export const shortCode = '100680ad'

export const urlFixture: Url = {
  id: 'cm123',
  originalUrl,
  shortCode,
  createdAt: new Date('2026-07-28T12:00:00.000Z'),
  clicks: 0,
}
