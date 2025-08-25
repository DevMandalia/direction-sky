# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Inject public env at build time so client code has the correct API base
ARG NEXT_PUBLIC_BIGQUERY_API_BASE
ARG NEXT_PUBLIC_BIGQUERY_API_KEY
ENV NEXT_PUBLIC_BIGQUERY_API_BASE=${NEXT_PUBLIC_BIGQUERY_API_BASE:-https://us-central1-dev-epsilon-467101-v2.cloudfunctions.net/polygon-options-fetcher}
ENV NEXT_PUBLIC_BIGQUERY_API_KEY=${NEXT_PUBLIC_BIGQUERY_API_KEY}
RUN npm run build

# Run stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Also set at runtime (not strictly needed for client, but safe for any server components)
ENV NEXT_PUBLIC_BIGQUERY_API_BASE=${NEXT_PUBLIC_BIGQUERY_API_BASE}
ENV NEXT_PUBLIC_BIGQUERY_API_KEY=${NEXT_PUBLIC_BIGQUERY_API_KEY}
# Use Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 8080
ENV PORT=8080
CMD ["node","server.js"]
