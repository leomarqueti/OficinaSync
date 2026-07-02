# ---- build ----
FROM node:22-bullseye-slim AS builder
WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# argon2 compila um binario nativo se nao achar um prebuild pronto pra essa
# combinacao exata de node/plataforma — garante as ferramentas de build como
# fallback pra nao quebrar o npm ci.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime ----
FROM node:22-bullseye-slim AS runtime
WORKDIR /app

# Puppeteer usa o Chromium do sistema em vez de baixar o próprio (mais confiável em container).
# python3/make/g++ ficam como fallback pra compilar o argon2 se não achar prebuild.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
