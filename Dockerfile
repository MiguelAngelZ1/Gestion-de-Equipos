# =============================================================================
# Dockerfile - Control de Equipos 3.0
# Multi-stage: frontend build (Vite) + backend serve (Express + SQLite)
# =============================================================================

# ---- Stage 1: Frontend build ----
FROM node:22-alpine AS frontend-builder

WORKDIR /build

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# ---- Stage 2: Backend production serve ----
FROM node:22-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend/ .
COPY --from=frontend-builder --chown=appuser:appgroup /build/dist /app/frontend/dist

RUN mkdir -p /app/backend/backups && chown appuser:appgroup /app/backend/backups

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
