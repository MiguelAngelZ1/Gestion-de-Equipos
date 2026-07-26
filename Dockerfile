# =============================================================================
# Dockerfile Multi-Stage - Control de Equipos 3.0
# Backend Express + Frontend React/Vite
# =============================================================================

# ------------------- Stage 1: Build Frontend -------------------
FROM node:22-slim AS frontend-builder

WORKDIR /app/frontend

RUN apt-get update && apt-get install -y \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY frontend/package.json frontend/pnpm-lock.yaml ./

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

COPY frontend/ ./

RUN pnpm run build

# ------------------- Stage 2: Production Runtime -------------------
FROM node:22-slim AS production

WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r appuser && useradd -r -g appuser -m appuser

# --- Backend ---
WORKDIR /app/backend

COPY backend/package.json backend/pnpm-lock.yaml ./

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile --prod

COPY backend/ ./

# --- Frontend build ---
RUN mkdir -p /app/frontend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# --- Environment ---
ENV NODE_ENV=production
ENV PORT=3000
ENV STATIC_PATH=/app/frontend/dist

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Non-root
USER appuser

EXPOSE 3000

CMD ["pnpm", "start"]
