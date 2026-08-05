# URL Shortener Frontend

Interface React de página única para criar, copiar e abrir URLs encurtadas.

## Executar

```bash
npm install
cp .env.example .env
npm run dev
```

Inicie o backend em `http://localhost:5000` e configure nele
`CORS_ALLOWED_ORIGIN` com a origem mostrada pelo Vite.

## Ambiente

```dotenv
VITE_API_BASE_URL=http://localhost:5000
```

O backend devolve `shortUrl` completo, usando seu próprio
`PUBLIC_SHORT_URL_BASE`. Assim o frontend não duplica a URL pública.

## Histórico da aba

O `sessionStorage` guarda apenas as cinco entradas mais recentes, no formato:

```json
{
  "shortUrl": "https://short.ly/aB3d",
  "originalUrl": "https://example.com/article"
}
```

O histórico sobrevive a reloads da aba, mas desaparece quando a aba é fechada.
Conteúdo alterado ou incompatível é descartado com validação Zod. Não existe
contador visual.

## Qualidade

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Leia `REACT_CONCEPTS.md` para uma explicação didática dos componentes, props,
estado, hooks e decisões usadas nesta interface.
