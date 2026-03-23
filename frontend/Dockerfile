# --- Etapa 1: Build ---
FROM oven/bun:1 AS build
WORKDIR /app

# Instalar dependencias (cacheadas si no cambian)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copiar codigo fuente
COPY . .

# Build con URL de API vacia (nginx hace de proxy)
ENV VITE_API_BASE_URL=""
RUN bun run build

# --- Etapa 2: Servir con nginx ---
FROM nginx:alpine

# Copiar archivos construidos
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuracion de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
