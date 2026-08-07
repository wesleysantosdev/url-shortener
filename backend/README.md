# URL Shortener Backend

Educational URL shortening API built with Node.js, Express, TypeScript, Prisma,
PostgreSQL, and Redis. The project prioritizes a small architecture that still
allows studying layer separation, caching, rate limiting, and the data lifecycle.

## How it works

1. `POST /api/v1/shortener` validates the URL and applies rate limiting by IP.
2. PostgreSQL creates a sequential `BIGINT`.
3. The ID goes through a reversible permutation based on `SHORT_CODE_SECRET`.
4. The shuffled number is converted to Base62 with 4 to 6 characters.
5. The API returns only the complete public URL.
6. `GET /:shortCode` decodes the ID, uses Redis as a read cache, and responds
   with a `302` redirect.
7. Each access increments `clicks` and updates `lastAccessedAt` directly.
8. A daily routine deletes URLs with no activity for 180 days.

The short code is not stored in the database, and there is no collision lookup:
different IDs always produce different codes within the `62^6` possibility
space. The transformation hides the sequence, but it is neither encryption nor
authentication.

## Run with Docker

```bash
cp .env.example .env
docker compose up -d --build
```

Compose starts only PostgreSQL, Redis, and the API. The API applies migrations
before starting the server.

```bash
docker compose ps
docker compose logs -f api
docker compose down
```

## Run Node.js locally

```bash
npm install
docker compose up -d shortener-db redis
npx prisma generate
npx prisma migrate deploy
npm run dev
```

## Main variables
- `DATABASE_URL`: PostgreSQL connection.
- `REDIS_URL`: Redis connection.
- `CORS_ALLOWED_ORIGIN`: exact frontend origin.
- `PUBLIC_SHORT_URL_BASE`: prefix returned to the user, such as
  `https://shorten.pro`.
- `SHORT_CODE_SECRET`: stable secret with at least 32 characters. Changing it
  breaks the decoding of existing links.
- `RATE_LIMIT_IP_HASH_SECRET`: different secret used to anonymize IPs.
- `URL_RETENTION_DAYS`: defaults to 180 days.

See all values in `.env.example`. In production, use random secrets and a
secrets manager.

After changing a variable used by the API, recreate the container so Compose
loads the new value:

```bash
docker compose -p url-shortener up -d --no-deps --force-recreate api
```

## HTTP contract

```bash
curl -X POST http://localhost:5000/api/v1/shortener \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/test"}'
```

```json
{
  "shortUrl": "http://localhost:5000/aB3d"
}
```

The returned link responds with `302`. Failures use `application/problem+json`
with a stable `code` for the client.

## Rate limiting

Redis maintains two sliding windows per anonymized IP:

- 5 valid attempts per minute;
- 20 successful creations per 24 hours.

If Redis is unavailable, creation fails closed to preserve protection.
Redirects continue querying PostgreSQL when the cache fails.

## Quality

```bash
npm test
npm run typecheck
npm run build
npx prisma validate
```
