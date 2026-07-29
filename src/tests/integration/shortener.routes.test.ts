import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { originalUrl, urlFixture } from '../helpers/url.fixture'

const createShortUrlMock = vi.hoisted(() => vi.fn())

vi.mock('../../modules/shortener/shortener.service', () => ({
  default: {
    createShortUrl: createShortUrlMock,
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
