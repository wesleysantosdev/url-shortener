import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../../app'

const allowedOrigin = process.env.CORS_ALLOWED_ORIGIN

if (!allowedOrigin) {
  throw new Error(
    'Missing CORS_ALLOWED_ORIGIN in test runtime: expected backend/.env to define it',
  )
}

describe('CORS', () => {
  it('allows preflight requests from the configured frontend origin', async () => {
    const response = await request(app)
      .options('/api/v1/shortener')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST')

    expect(response.status).toBe(204)
    expect(response.headers['access-control-allow-origin']).toBe(
      allowedOrigin,
    )
  })

  it('does not grant access to an unconfigured origin', async () => {
    const response = await request(app)
      .options('/api/v1/shortener')
      .set('Origin', 'https://untrusted.example.com')
      .set('Access-Control-Request-Method', 'POST')

    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })
})
