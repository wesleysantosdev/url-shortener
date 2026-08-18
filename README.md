# Shrten

Full-stack URL shortener built with React, TypeScript, Express, PostgreSQL, and
Redis. The application generates compact Base62 links, provides fast redirects
through caching, and protects URL creation with IP-based rate limiting.

## Running locally

Start the API and its dependencies:

```bash
cd backend
cp .env.example .env
npm install
docker compose up -d shortener-db redis
npx prisma generate
npx prisma migrate deploy
npm run dev
```

In another terminal, start the web application:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Verification

```bash
cd backend
npm test
npm run typecheck
npm run build

cd ../frontend
npm run lint
npm run typecheck
npm test
npm run build
```

Production runs at [shrten.pro](https://shrten.pro) with Docker Compose and
Caddy. GitHub Actions validates both applications and deploys the approved
`main` branch to an Oracle Cloud VPS.

More details are available in the [backend](backend/README.md) and
[frontend](frontend/README.md) documentation.
