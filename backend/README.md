# URL Shortener Backend

API didática de encurtamento de URLs com Node.js, Express, TypeScript, Prisma,
PostgreSQL e Redis. O projeto prioriza uma arquitetura pequena que ainda permite
estudar separação de camadas, cache, rate limit e ciclo de vida dos dados.

## Como funciona

1. `POST /api/v1/shortener` valida a URL e aplica rate limit por IP.
2. PostgreSQL cria um `BIGINT` sequencial.
3. O ID passa por uma permutação reversível baseada em `SHORT_CODE_SECRET`.
4. O número embaralhado vira Base62 com 4 a 6 caracteres.
5. A API devolve somente a URL pública completa.
6. `GET /:shortCode` decodifica o ID, usa Redis como cache de leitura e responde
   com redirecionamento `302`.
7. Cada acesso incrementa `clicks` e atualiza `lastAccessedAt` diretamente.
8. Uma rotina diária apaga URLs sem atividade por 180 dias.

O shortcode não é salvo no banco e não há consulta de colisão: IDs diferentes
sempre produzem códigos diferentes dentro do espaço de `62^6` possibilidades.
A transformação oculta a sequência, mas não é criptografia nem autenticação.

## Executar com Docker

```bash
cp .env.example .env
docker compose up -d --build
```

O Compose inicia somente PostgreSQL, Redis e API. A API aplica migrations antes
de iniciar o servidor.

```bash
docker compose ps
docker compose logs -f api
docker compose down
```

## Executar Node.js localmente

```bash
npm install
docker compose up -d shortener-db redis
npx prisma generate
npx prisma migrate deploy
npm run dev
```

## Variáveis principais

- `DATABASE_URL`: conexão PostgreSQL.
- `REDIS_URL`: conexão Redis.
- `CORS_ALLOWED_ORIGIN`: origem exata do frontend.
- `PUBLIC_SHORT_URL_BASE`: prefixo devolvido ao usuário, como
  `https://short.ly`.
- `SHORT_CODE_SECRET`: secret estável com pelo menos 32 caracteres. Alterá-la
  quebra a decodificação dos links existentes.
- `RATE_LIMIT_IP_HASH_SECRET`: secret diferente para anonimizar IPs.
- `URL_RETENTION_DAYS`: padrão de 180 dias.

Veja todos os valores em `.env.example`. Em produção, use secrets aleatórias e
um gerenciador de segredos.

Ao alterar uma variável usada pela API, recrie o container para que o Compose
carregue o novo valor:

```bash
docker compose -p url-shortener up -d --no-deps --force-recreate api
```

## Contrato HTTP

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

O link retornado responde `302`. Falhas usam `application/problem+json` com um
`code` estável para o cliente.

## Rate limit

Redis mantém duas janelas móveis por IP anonimizado:

- 5 tentativas válidas por minuto;
- 20 criações bem-sucedidas por 24 horas.

Se Redis estiver indisponível, a criação falha fechada para não perder a proteção.
Redirecionamentos continuam consultando PostgreSQL quando o cache falha.

## Qualidade

```bash
npm test
npm run typecheck
npm run build
npx prisma validate
```
