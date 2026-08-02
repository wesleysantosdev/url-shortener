# syntax=docker/dockerfile:1

FROM node:24-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci


FROM dependencies AS build

# O Prisma 7 carrega prisma.config.ts até durante a geração do client.
# Esta URL existe apenas no build; nenhum banco é acessado por `prisma generate`.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

COPY prisma.config.ts tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts

RUN npx prisma generate
RUN npm run build


# Mantém as devDependencies, incluindo Autocannon, somente na imagem de ferramentas.
FROM build AS tools

CMD ["node", "dist/scripts/benchmark.js"]


FROM node:24-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma/generated ./prisma/generated
COPY prisma.config.ts ./
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY prisma/migrations ./prisma/migrations

USER node

EXPOSE 5000

CMD ["node", "dist/src/server.js"]
