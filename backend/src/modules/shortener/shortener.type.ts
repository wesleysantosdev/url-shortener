export interface CreateShortUrlData {
  originalUrl: string
  shortCode: string
  expiresAt: Date
}

export interface ClickIncrement {
  shortCode: string
  count: number
  lastAccessedAt: Date
  expiresAt: Date
}

export interface ClickEvent {
  shortCode: string
  accessedAt: Date
}

export type CreatedShortUrlDto = Pick<
  Url,
  'id' | 'shortCode' | 'originalUrl' | 'createdAt' | 'clicks'
>

/** Maps the persisted URL to the stable public creation response. */
export function toCreatedShortUrlDto(url: Url): CreatedShortUrlDto {
  return {
    id: url.id,
    shortCode: url.shortCode,
    originalUrl: url.originalUrl,
    createdAt: url.createdAt,
    clicks: url.clicks,
  }
}
import { Url } from '../../../prisma/generated/client'
