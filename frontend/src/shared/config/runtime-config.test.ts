import { describe, expect, it } from 'vitest'
import { parseRuntimeConfig } from './runtime-config'

describe('parseRuntimeConfig', () => {
  it('uses local backend defaults when optional environment values are absent', () => {
    expect(parseRuntimeConfig({})).toEqual({
      apiBaseUrl: 'http://localhost:5000',
      publicShortUrlBase: 'http://localhost:5000',
    })
  })

  it('normalizes configured HTTP origins', () => {
    expect(
      parseRuntimeConfig({
        VITE_API_BASE_URL: 'https://api.example.com/',
        VITE_PUBLIC_SHORT_URL_BASE: 'https://go.example.com/',
      }),
    ).toEqual({
      apiBaseUrl: 'https://api.example.com',
      publicShortUrlBase: 'https://go.example.com',
    })
  })

  it('rejects origins that do not use HTTP or HTTPS', () => {
    expect(() =>
      parseRuntimeConfig({ VITE_API_BASE_URL: 'ftp://api.example.com' }),
    ).toThrow(/VITE_API_BASE_URL/)
  })
})
