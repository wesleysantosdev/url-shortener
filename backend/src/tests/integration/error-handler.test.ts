import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictError } from '../../shared/errors'

const createShortUrlMock = vi.hoisted(() => vi.fn())

vi.mock('../../modules/shortener/shortener.service', () => ({
  default: {
    createShortUrl: createShortUrlMock,
  },
}))

import { app } from '../../app'

describe('application error pipeline', () => {
  beforeEach(() => {
    createShortUrlMock.mockResolvedValue({})
  })

  it('returns 400 Problem Details for malformed JSON', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = await request(app)
      .post('/api/v1/shortener')
      .set('Content-Type', 'application/json')
      .send('{"url":')

    expect(response.status).toBe(400)
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    )
    expect(response.body).toMatchObject({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'The request body contains invalid JSON',
      instance: '/api/v1/shortener',
      code: 'INVALID_JSON',
    })
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it('returns 404 Problem Details for an unknown route', async () => {
    const response = await request(app).get('/api/missing')

    expect(response.status).toBe(404)
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    )
    expect(response.body).toMatchObject({
      title: 'Not Found',
      status: 404,
      detail: 'Route GET /api/missing not found',
      instance: '/api/missing',
      code: 'ROUTE_NOT_FOUND',
    })
  })

  it('serializes expected application errors without logging them', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    createShortUrlMock.mockRejectedValue(
      new ConflictError(
        'SHORT_URL_ALREADY_EXISTS',
        'A short URL with this code already exists',
      ),
    )

    const response = await request(app)
      .post('/api/v1/shortener')
      .send({ url: 'https://example.com' })

    expect(response.status).toBe(409)
    expect(response.body).toMatchObject({
      title: 'Conflict',
      status: 409,
      code: 'SHORT_URL_ALREADY_EXISTS',
    })
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it('logs unexpected errors but does not expose their details', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    createShortUrlMock.mockRejectedValue(
      new Error('password=secret; Prisma connection failed'),
    )

    const response = await request(app)
      .post('/api/v1/shortener')
      .send({ url: 'https://example.com' })

    expect(response.status).toBe(500)
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    )
    expect(response.body).toMatchObject({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred',
      instance: '/api/v1/shortener',
      code: 'INTERNAL_SERVER_ERROR',
    })
    expect(JSON.stringify(response.body)).not.toContain('secret')
    expect(JSON.stringify(response.body)).not.toContain('Prisma')
    expect(JSON.stringify(response.body)).not.toContain('stack')
    expect(consoleSpy).toHaveBeenCalledOnce()
  })
})
