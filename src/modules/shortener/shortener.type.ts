export interface CreateShortUrlData {
  originalUrl: string
  shortCode: string
}

export interface ClickIncrement {
  shortCode: string
  count: number
}
