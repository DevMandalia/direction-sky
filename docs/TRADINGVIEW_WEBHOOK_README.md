# TradingView Webhook Integration

## Overview

This integration ingests TradingView alert webhooks into BigQuery and exposes a read API for the UI. It also powers the Trading Alerts tab in the frontend.

- Ingest function: `tradingview-webhook-receiver`
- Read API function: `tradingview-alerts-api`
- Health function: `tradingview-health-check`
- Storage: BigQuery table `direction_sky_data.tradingview_alerts`

## Deployment

- Table creation is handled by `scripts/setup-tradingview-alerts.sql` (invoked from `scripts/deploy-all-functions.sh`).
- Deploy functions (via script or directly):

```bash
# From repo root
bash scripts/deploy-all-functions.sh
# or targeted
gcloud functions deploy tradingview-webhook-receiver \
  --runtime nodejs24 --trigger-http --allow-unauthenticated \
  --region=us-central1 --source=src/functions --entry-point=tradingviewWebhookReceiver

gcloud functions deploy tradingview-alerts-api \
  --runtime nodejs24 --trigger-http --allow-unauthenticated \
  --region=us-central1 --source=src/functions --entry-point=tradingviewAlertsApi
```

## Environment Variables

Backend (Cloud Functions):
- `GOOGLE_CLOUD_PROJECT`: GCP project ID
- `BIGQUERY_DATASET`: defaults to `direction_sky_data`
- `TRADINGVIEW_WEBHOOK_SECRET`: optional for signature validation
- `TRADINGVIEW_RATE_LIMIT_ENABLED`: defaults false unless Redis configured
- `TRADINGVIEW_SIGNATURE_VALIDATION`: set true to enforce signature checking
- `REDIS_URL`: optional (Memorystore or external Redis). If not set, caching and rate limiting are disabled.

Frontend (Cloud Run / Next.js):
- `NEXT_PUBLIC_TRADINGVIEW_API_URL`: Alerts API base URL (e.g., `https://us-central1-<PROJECT>.cloudfunctions.net/tradingview-alerts-api`)

## Security & Constraints

- IP allowlist: Webhook checks `X-Forwarded-For` and allows only the official TradingView IPv4s:
  - 52.89.214.238, 34.212.75.30, 54.218.53.128, 52.32.178.7
- HTTPS only; ports 80/443 only (Cloud Functions defaults to 443).
- 3-second TradingView timeout: We write to BigQuery inline. If this becomes an issue, switch to async persist via Cloud Tasks/Pub/Sub.

## Payload Formats

The webhook receiver accepts:

1) JSON (preferred):
```json
{
  "ticker": "TSLA",
  "action": "buy",
  "price": 250.5,
  "sentiment": "bullish",
  "quantity": 100,
  "strategyName": "My Strategy",
  "timeframe": "1h"
}
```

2) Plain text (key:value or key=value; comma/newline separated):
```
Ticker: TSLA, action=buy, price=250.5, sentiment=bullish, qty=100, timeframe=1h
```
- Parsed keys: `ticker/symbol`, `action`, `price`, `sentiment`, `quantity/qty/contracts`, `timeframe/interval`, `exchange`, `strategy/strategyName`.
- Full text is stored in `alert_message`.

## BigQuery Schema

Table: `direction_sky_data.tradingview_alerts` (partitioned by DATE(timestamp), clustered by ticker, action).
Key columns: `alert_id`, `timestamp`, `ticker`, `action`, `price`, `sentiment`, `quantity`, `strategy_name`, `alert_message`, `raw_payload`, `processed_at`, `source_ip`, `timeframe`, `exchange`, `market_position`, `created_at`.

## Read API

Base: `tradingview-alerts-api`

- `GET /alerts?ticker=&action=&sentiment=&dateFrom=&dateTo=&strategyName=&page=&limit=`
- `GET /alerts/{ticker}?page=&limit=`
- `GET /stats`
- `GET /health`

## Frontend Integration

- Set `NEXT_PUBLIC_TRADINGVIEW_API_URL` and deploy the web app (`scripts/deploy.sh`).
- Alerts tab lives in `src/app/components/alerts/*` and is added to `src/app/page.tsx`.

## Testing

Webhook (JSON):
```bash
curl -s -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d '{"ticker":"TSLA","action":"buy","price":250.5,"sentiment":"bullish"}'
```

Webhook (plain text):
```bash
curl -s -X POST "$WEBHOOK_URL" -H "Content-Type: text/plain" --data-binary "ticker: TSLA, action=buy, price=250.5, sentiment=bullish"
```

Read API:
```bash
curl -s "$ALERTS_API_URL/alerts?limit=10" | jq
```

BigQuery quick check:
```bash
bq query --use_legacy_sql=false \
'SELECT alert_id, timestamp, ticker, action, price FROM `'"$PROJECT"'.'"$DATASET"'.tradingview_alerts` ORDER BY timestamp DESC LIMIT 10'
```

## Troubleshooting

- 429 rate limit: Enable Redis and set `TRADINGVIEW_RATE_LIMIT_ENABLED=true`.
- IP rejected: Verify TradingView IPs; check `X-Forwarded-For` header in logs.
- Timeout: Consider async persist.
- Plain text not parsed: Ensure key:value or key=value formatting; unknown keys are ignored, full text still stored.
