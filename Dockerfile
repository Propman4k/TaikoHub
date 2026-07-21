# ── Stage 1: Client bauen (Vite -> dist/) ────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Server-Runtime ──────────────────────────────────────────────────
FROM node:20-slim
WORKDIR /app

# Build-Tools nur fuer native Module (better-sqlite3), danach wieder entfernen.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev \
  && apt-get purge -y python3 make g++ && apt-get autoremove -y

COPY server ./server
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/server/cache && chmod 777 /app/server/cache

# Prod-Port 3007 (3006 ist auf der NAS von TaikoEat belegt). Ueberschreibbar via .env.
ENV NODE_ENV=production
ENV PORT=3007
ENV TZ=Europe/Berlin
EXPOSE 3007
WORKDIR /app/server
CMD ["node", "index.mjs"]
