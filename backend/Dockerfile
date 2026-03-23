FROM oven/bun:1-alpine AS base
WORKDIR /app

# Instalar dependencias (cacheadas si no cambian)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copiar codigo fuente
COPY index.ts ./
COPY tsconfig.json ./

EXPOSE 3001

CMD ["bun", "run", "index.ts"]
