# URL Shortener

API didática de encurtamento de URLs construída com Node.js, Express,
TypeScript, Prisma, PostgreSQL e Redis.

O projeto oferece:

- criação por `POST /api/v1/shortener`;
- redirecionamento público por `GET /:shortCode`;
- cache-aside Redis para leituras rápidas;
- contagem assíncrona de cliques com Redis List e worker em batch;
- modo baseline sem cache/fila para comparação de performance;
- benchmark HTTP com Autocannon.

Guias disponíveis:

- [System Design e TypeScript](./SYSTEM_DESIGN_STUDY.md)
- [Docker, imagem e serviços](./DOCKER_GUIDE.md)
- [Benchmark detalhado, com e sem otimizações](./PERFORMANCE_TEST_GUIDE.md)

## Preparação

### Tudo dentro do Docker

```bash
docker compose --profile app up -d --build
```

### Node local e somente infraestrutura no Docker

```bash
cp .env.example .env
npm install
docker compose up -d
npx prisma generate
npx prisma migrate deploy
```

Em dois terminais:

```bash
npm run dev:optimized
npm run worker
```

Crie uma URL:

```bash
curl -X POST http://localhost:5000/api/v1/shortener \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}'
```

Abra o código retornado:

```bash
curl -i http://localhost:5000/SEU_SHORT_CODE
```

## Scripts

```bash
npm run dev
npm run dev:optimized
npm run dev:baseline
npm run worker
npm run benchmark
npm test
npm run typecheck
npm run build
```
