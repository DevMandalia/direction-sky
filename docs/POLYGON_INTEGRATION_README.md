# Polygon Integration - End-to-End Flow

Comprehensive documentation for Polygon.io integration: API calls, BigQuery storage, Cloud Functions & Schedulers, and UI fetch/display endpoints.

## Overview

- Functions:
  - `src/functions/polygonOptionsDataFetcher.ts` → deployed as `polygon-options-fetcher`
  - `src/functions/polygonOptionsDataFetcher.ts` → `polygonHealthCheck` (deployed as `polygon-health-check`)
- Services: `src/services/polygonDatabaseService.ts`
- API Client: `src/utils/polygonAPIClient.ts`
- Schedulers: Hourly + Market Open/Close (via `scripts/setup-polygon-scheduler.js`)
- Storage: BigQuery tables `polygon_options`, `polygon_stocks`, `polygon_crypto`, `polygon_realtime`
- UI Endpoints: `/api/polygon-options/*` exposed by the Cloud Function

## API Calls

- Base URL: `https://api.polygon.io`
- Auth: `apiKey` query parameter; also `Authorization: Bearer <POLYGON_API_KEY>` header is set

Key endpoints used (see `polygonAPIClient.ts`):
- `GET /v3/snapshot/options/{underlying}` → options chain snapshot
- `GET /v3/snapshot/options/{underlying}/unified` → unified options snapshot
- `GET /v3/snapshot/options/{underlying}/{contract}` → contract snapshot
- `GET /v2/snapshot/locale/us/markets/stocks/tickers/{ticker}` → stock snapshot
- `GET /v2/snapshot/locale/global/markets/crypto/tickers/{ticker}` → crypto snapshot

WebSocket (optional real-time):
- Stocks: `wss://delayed.polygon.io`
- Subscriptions: `T.<SYM>`, `Q.<SYM>`; options: `OT.<SYM>`, `OQ.<SYM>`, `OG.<SYM>`

## Cloud Functions

### `polygonOptionsDataFetcher`

Routes (path-based inside the same HTTP function):
- `GET /api/polygon-options/expiry-dates` → returns `{ dates: string[] }` from BigQuery
- `POST /api/polygon-options` → body: `{ query: string, parameters?: [...] }` → returns `{ rows }`
- Legacy actions via query/body `action`:
  - `action=health-check` → readiness info
  - `action=fetch-and-store&symbol=MSTR&expiry=YYYY-MM-DD` → fetch Polygon snapshots and upsert to BQ
  - `action=fetch-only&symbol=MSTR&expiry=YYYY-MM-DD` → fetch without storage
  - `action=get-expiry-dates&symbol=MSTR` → (placeholder until DB method implemented)
  - `action=get-options-data&symbol=MSTR&expiry=YYYY-MM-DD` → (placeholder until DB method implemented)
  - `action=get-underlying-price&symbol=MSTR` → (placeholder until DB method implemented)

Entry Points:
- `polygonOptionsDataFetcher` and `polygonHealthCheck` exported from `src/functions/index.ts`

## BigQuery Storage

Tables initialized/used (see `polygonDatabaseService.ts`):

### `polygon_options`
- Primary key (logical): `(date, contract_id)`
- Partitioning: `DATE(date)`; Clustering: `date, contract_id`
- Fields include contract details, greeks, quote/trade data, market data, day/prev-day metrics, metadata, and computed `score`.

### `polygon_stocks`
- Timestamps, quotes, trades, prev-day metrics, metadata.

### `polygon_crypto`
- Timestamps, quotes, trades, prev-day metrics, metadata.

### `polygon_realtime`
- Real-time events for trades/quotes/greeks with metadata.

Batch upserts use MERGE statements to avoid duplicates (match on `contract_id` + `date`).

## UI Fetch & Display

The same Cloud Function exposes UI-friendly endpoints:
- `GET /api/polygon-options/expiry-dates` → used to populate expiry dropdowns
- `POST /api/polygon-options` → run parameterized queries to drive tables/charts

Example client request:
```bash
curl -X POST "$POLYGON_FUNCTION_URL/api/polygon-options" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM `'$GOOGLE_CLOUD_PROJECT'.'$BIGQUERY_DATASET'.polygon_options` WHERE underlying_asset=@symbol AND expiration_date=@expiry LIMIT 100",
    "parameters": [
      { "name": "symbol", "value": "MSTR" },
      { "name": "expiry", "value": "2024-12-20" }
    ]
  }'
```

## Deployment

```bash
gcloud functions deploy polygon-options-fetcher \
  --runtime nodejs24 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1 \
  --source src/functions \
  --entry-point polygonOptionsDataFetcher \
  --set-env-vars POLYGON_API_KEY=$POLYGON_API_KEY,BIGQUERY_DATASET=$BIGQUERY_DATASET,GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT

gcloud functions deploy polygon-health-check \
  --runtime nodejs24 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1 \
  --source src/functions \
  --entry-point polygonHealthCheck \
  --set-env-vars POLYGON_API_KEY=$POLYGON_API_KEY,BIGQUERY_DATASET=$BIGQUERY_DATASET,GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT
```

## Scheduling

See `scripts/setup-polygon-scheduler.js` for job definitions. Current cadence:
- Hourly during market hours, plus explicit Market Open and Market Close jobs.

## Environment Variables

- `POLYGON_API_KEY` (required)
- `GOOGLE_CLOUD_PROJECT`, `GOOGLE_APPLICATION_CREDENTIALS`
- `BIGQUERY_DATASET` (default `direction_sky_data`)

## File Map & Responsibilities

- `src/utils/polygonAPIClient.ts` → REST + WebSocket client wrappers
- `src/services/polygonDatabaseService.ts` → BigQuery schema init and upsert logic
- `src/functions/polygonOptionsDataFetcher.ts` → HTTP function, routes, orchestration
- `scripts/setup-polygon-scheduler.js` → Cloud Scheduler jobs for cadence
- `scripts/deploy-polygon.js` (and `deploy-all-functions.sh`) → deployment helpers

## Troubleshooting

- 401/403: verify `POLYGON_API_KEY` and rate limits
- BigQuery MERGE errors: confirm dataset, table existence, and service account roles
- WebSocket disconnects: built-in reconnect; verify `wsUrl` and network egress


