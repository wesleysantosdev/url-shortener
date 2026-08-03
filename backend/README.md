# URL Shortener Backend

Node.js and Express API for shortening URLs, built with TypeScript, Prisma,
PostgreSQL, and Redis.

The API supports URL creation through `POST /api/v1/shortener`, public redirects
through `GET /:shortCode`, Redis cache-aside reads, asynchronous click tracking
with a Redis List and batch worker, a baseline mode without caching or queuing,
and HTTP benchmarking with Autocannon.

## Local setup

### Run everything with Docker

```bash
docker compose -p url-shortener --profile app up -d --build
```

### Run Node.js locally with Docker infrastructure

```bash
cp .env.example .env
npm install
docker compose -p url-shortener up -d
npx prisma generate
npx prisma migrate deploy
```

Start the API and worker in separate terminals:

```bash
npm run dev:optimized
npm run worker
```

## Environment

The backend `.env` file is the single source of truth for CORS. Set
`CORS_ALLOWED_ORIGIN` to the exact frontend origin before starting or recreating
the API. For example:

```dotenv
CORS_ALLOWED_ORIGIN=http://localhost:5173
```

After changing this value, restart the local API or recreate only the Docker
Compose API service so the container receives the updated environment:

```bash
docker compose -p url-shortener --profile app up -d --no-deps --force-recreate api
```

## API usage

Create a short URL:

```bash
curl -X POST http://localhost:5000/api/v1/shortener \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}'
```

Open the returned short code:

```bash
curl -i http://localhost:5000/YOUR_SHORT_CODE
```

## Development commands

```bash
npm run dev
npm run dev:optimized
npm run dev:baseline
npm run worker
npm run benchmark
```

## Quality commands

```bash
npm test
npm run typecheck
npm run build
```
