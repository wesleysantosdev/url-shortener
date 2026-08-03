# URL Shortener Frontend

Single-page React interface for the URL Shortener API.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Start the backend on `http://localhost:5000`. Its `backend/.env` file is the
single source of truth for CORS. Set `CORS_ALLOWED_ORIGIN` to the exact origin
printed by Vite, then restart the backend. For example:

```dotenv
CORS_ALLOWED_ORIGIN=http://localhost:5173
```

If Vite selects another port, update only this value. Docker Compose passes it
through without a fallback.

## Environment

```dotenv
VITE_API_BASE_URL=http://localhost:5000
VITE_PUBLIC_SHORT_URL_BASE=http://localhost:5000
```

`VITE_API_BASE_URL` is used for `POST /api/v1/shortener`.
`VITE_PUBLIC_SHORT_URL_BASE` is used to construct the clickable redirect URL
from the returned `shortCode`. They may differ in production.

## Quality commands

```bash
npm test
npm run lint
npm run typecheck
npm run build
```
