import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '../../shared/errors'
import { originalUrl, urlFixture } from '../helpers/url.fixture'

const { createShortUrlMock, resolveShortUrlMock } = vi.hoisted(() => ({
  createShortUrlMock: vi.fn(),
  resolveShortUrlMock: vi.fn(),
}))

vi.mock('../../modules/shortener/shortener.service', () => ({
  default: {
    createShortUrl: createShortUrlMock,
    resolveShortUrl: resolveShortUrlMock,
  },
}))

import { app } from '../../app'

describe('POST /api/v1/shortener', () => {
  beforeEach(() => {
    createShortUrlMock.mockResolvedValue(urlFixture)
  })

  it('returns the created short URL', async () => {
    const response = await request(app)
      .post('/api/v1/shortener')
      .send({ url: originalUrl })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      message: 'Short URL created successfully',
      data: {
        ...urlFixture,
        createdAt: urlFixture.createdAt.toISOString(),
      },
    })
    expect(createShortUrlMock).toHaveBeenCalledWith(originalUrl)
  })

  it.each([
    {
      name: 'missing URL',
      body: {},
      path: 'url',
    },
    {
      name: 'non-string URL',
      body: { url: 42 },
      path: 'url',
    },
    {
      name: 'unsupported protocol',
      body: { url: 'ftp://example.com' },
      path: 'url',
    },
    {
      name: 'unknown field',
      body: { url: originalUrl, unexpected: true },
      path: 'body',
    },
  ])('returns Problem Details for $name', async ({ body, path }) => {
    const response = await request(app).post('/api/v1/shortener').send(body)

    expect(response.status).toBe(422)
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    )
    expect(response.body).toMatchObject({
      type: 'about:blank',
      title: 'Unprocessable Content',
      status: 422,
      detail: 'Request validation failed',
      instance: '/api/v1/shortener',
      code: 'VALIDATION_ERROR',
      errors: [expect.objectContaining({ path })],
    })
    expect(createShortUrlMock).not.toHaveBeenCalled()
  })
})

describe('GET /:shortCode', () => {
  beforeEach(() => {
    resolveShortUrlMock.mockResolvedValue(originalUrl)
  })

  it('redirects to the original URL without allowing response caching', async () => {
    const response = await request(app).get(`/${urlFixture.shortCode}`)

    expect(response.status).toBe(302)
    expect(response.headers.location).toBe(originalUrl)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(resolveShortUrlMock).toHaveBeenCalledWith(urlFixture.shortCode)
  })

  it('returns Problem Details when the short code does not exist', async () => {
    resolveShortUrlMock.mockRejectedValue(
      new NotFoundError('Short URL not found', 'SHORT_URL_NOT_FOUND'),
    )

    const response = await request(app).get(`/${urlFixture.shortCode}`)

    expect(response.status).toBe(404)
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    )
    expect(response.body).toMatchObject({
      status: 404,
      detail: 'Short URL not found',
      instance: `/${urlFixture.shortCode}`,
      code: 'SHORT_URL_NOT_FOUND',
    })
  })

  it('returns not found without querying services for an invalid code', async () => {
    const response = await request(app).get('/not-a-short-code')

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({
      code: 'SHORT_URL_NOT_FOUND',
      detail: 'Short URL not found',
    })
    expect(resolveShortUrlMock).not.toHaveBeenCalled()
  })

  it('keeps redirecting legacy eight-character codes', async () => {
    const legacyShortCode = '100680ad'

    const response = await request(app).get(`/${legacyShortCode}`)

    expect(response.status).toBe(302)
    expect(resolveShortUrlMock).toHaveBeenCalledWith(legacyShortCode)
  })
})
