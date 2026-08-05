# URL Shortener Frontend

Single-page React interface for creating, copying, and opening shortened URLs.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Start the backend at `http://localhost:5000` and configure
`CORS_ALLOWED_ORIGIN` there with the origin shown by Vite.

## Environment

```dotenv
VITE_API_BASE_URL=http://localhost:5000
```

The backend returns the complete `shortUrl`, using its own
`PUBLIC_SHORT_URL_BASE`. This way, the frontend does not duplicate the public
URL.

## Tab history

`sessionStorage` stores only the five most recent entries, in this format:

```json
{
  "shortUrl": "https://short.ly/aB3d",
  "originalUrl": "https://example.com/article"
}
```

The history survives tab reloads but disappears when the tab is closed.
Modified or incompatible content is discarded through Zod validation. There is
no visual counter.

## Quality

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Read `REACT_CONCEPTS.md` for an educational explanation of the components,
props, state, hooks, and decisions used in this interface.
