# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# CT223 — Lia Job Search deployment image
#
#   - Node 22 (bookworm-slim)
#   - pnpm via Corepack (packageManager: pnpm@11.18.0)
#   - Bun 1.3.14 in the runtime (portal search skills execute under Bun)
#   - Next.js standalone output
#   - non-root runtime user
#   - .agents shipped (portal skills + SKILL.md discovery)
#   - no secrets baked into the image (keys come from runtime.env at runtime)
#   - persistent data at /app/data (bind: /opt/lia-job-search/data:/app/data)
#   - APP_COMMIT build arg -> runtime env (informational, /api/health)
# ---------------------------------------------------------------------------

FROM node:22-bookworm-slim AS deps

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable \
 && corepack prepare pnpm@11.18.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

RUN pnpm install --frozen-lockfile


FROM node:22-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_STANDALONE=true

RUN corepack enable \
 && corepack prepare pnpm@11.18.0 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build \
 && mkdir -p /app/canvas-libs/@napi-rs /app/canvas-libs/pdf-parse /app/canvas-libs/pdfjs-dist \
 && find /app/node_modules/.pnpm -maxdepth 1 -name "*canvas*" -exec sh -c 'cp -r -L {}/node_modules/@napi-rs/* /app/canvas-libs/@napi-rs/' \; \
 && find /app/node_modules/.pnpm -maxdepth 1 -name "*pdf-parse*" -exec sh -c 'cp -r -L {}/node_modules/pdf-parse /app/canvas-libs/pdf-parse' \; \
 && find /app/node_modules/.pnpm -maxdepth 1 -name "*pdfjs-dist*" -exec sh -c 'cp -r -L {}/node_modules/pdfjs-dist /app/canvas-libs/pdfjs-dist' \;


FROM oven/bun:1.3.14 AS bun-runtime


FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV LIA_DATA_DIR=/app/data

# Identidade de release (informativa — exposta via /api/health; nunca secreta)
ARG APP_COMMIT
ENV APP_COMMIT=$APP_COMMIT

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs \
 && mkdir -p /app/data \
 && chown -R nextjs:nodejs /app

COPY --from=bun-runtime /usr/local/bin/bun /usr/local/bin/bun

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/canvas-libs/@napi-rs ./node_modules/@napi-rs
COPY --from=builder --chown=nextjs:nodejs /app/canvas-libs/pdf-parse ./node_modules/pdf-parse
COPY --from=builder --chown=nextjs:nodejs /app/canvas-libs/pdfjs-dist ./node_modules/pdfjs-dist
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/.agents ./.agents

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
