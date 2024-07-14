FROM node:20-alpine as base
RUN apk add --no-cache libc6-compat python3 make g++ && \
    apk upgrade --no-cache
WORKDIR /app

RUN corepack enable pnpm

ENV PNPM_HOME="/root/.local/share/pnpm/global" \
    PATH="$PATH:/root/.local/share/pnpm/global"

COPY package.json package.json
RUN pnpm -v
ENV COREPACK_ENABLE_NETWORK=0

RUN pnpm config set store-dir /root/.local/share/pnpm/global/store/v3
RUN pnpm config set update-notifier false

# Disable telemetry
ENV TURBO_TELEMETRY_DISABLED=1

# Isolate workspace by pruning non-related services.
FROM base AS pruner

# renovate: datasource=npm depName=turbo
ENV TURBO_VERSION=2
RUN pnpm add -g turbo@${TURBO_VERSION}

COPY . .

RUN pnpm turbo prune --scope=@imagiro/imagiro-worker --docker

# Build project with isolated workspace
FROM base AS builder

COPY .gitignore pnpm-workspace.yaml ./

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Mount cache to copy from content-addressable store
RUN --mount=type=cache,target=/root/.local/share/pnpm/global/store/v3\
  pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

# To relink dependencies with ./bin links
RUN pnpm install --frozen-lockfile --offline

ARG PACKAGE_PATH
RUN pnpm turbo run build --filter=@imagiro/imagiro-worker

# Worker
FROM node:20-alpine
RUN apk add --no-cache deno && \
    apk upgrade --no-cache

RUN addgroup --system --gid 1001 imagiro && \
    adduser --system --uid 1001 imagiro
USER imagiro

WORKDIR /app/packages/imagiro-worker
RUN mkdir ./program

ENV NODE_ENV=production
COPY --from=builder --chown=imagiro:imagiro /app /app
CMD node "main.js"
