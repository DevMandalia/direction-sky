# FRED Integration - End-to-End Flow

This document covers the complete FRED (Federal Reserve Economic Data) integration in Direction Sky: API calls, storage in BigQuery, deployment, and scheduling.

## Overview

- Function: `src/functions/fredDataFetcher.ts` (deployed as `fred-fetcher`)
- Schedules: Hourly Cloud Scheduler job (`fred-ingestion-hourly`)
- Storage: BigQuery table `fred_metrics` in dataset `direction_sky_data`
- Caching: Optional Redis for latest values and query results

## API Calls

- Base URL: `https://api.stlouisfed.org/fred`
- Method: GET `/{endpoint}` with API key and parameters
- Auth: `api_key` query parameter (`FRED_API_KEY`)

### Metrics (examples)

- Interest rates: `FEDFUNDS`, `DPRIME`, `DGS10`, `DGS2`
- Employment: `UNRATE`, `PAYEMS`, `CIVPART`
- GDP: `GDP`, `A191RL1Q225SBEA`, `A939RX0Q048SBEA`
- Inflation: `CPIAUCSL`, `CPILFESL`, `PCEPI`
- Money supply: `M1SL`, `M2SL`
- Housing: `HOUST`, `EXHOSLUSM495S`
- Consumer: `PCE`, `RSAFS`
- Manufacturing: `INDPRO`, `TCUM`
- Trade: `BOPGSTB`, `EXPGS`, `IMPGS`
- Markets: `DJIA`, `SP500`, `VIXCLS`
- Currency: `DTWEXBGS`, `DEXUSEU`

### Example Request

```bash
curl "https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS&api_key=$FRED_API_KEY&file_type=json&limit=100&sort_order=desc"
```

### Function Flow

1. Iterates `FRED_METRICS` and calls `apiClient.fetchFREDData(endpoint, params)`
2. Parses response; stores each observation via `databaseService.storeFREDData`
3. Sends a summary to the processing layer (if configured)
4. Returns a JSON summary with counts and latest values

Code pointers:
- `src/functions/fredDataFetcher.ts` → API loop, storage, summary
- `src/utils/apiClient.ts` → `fetchFREDData`
- `src/services/databaseService.ts` → `initializeTable`, `storeFREDData`, query helpers

## BigQuery Storage

- Dataset: `direction_sky_data` (env: `BIGQUERY_DATASET`)
- Table: `fred_metrics` (env: `BIGQUERY_TABLE`)

Schema:
```sql
CREATE TABLE `direction_sky_data.fred_metrics` (
  timestamp TIMESTAMP NOT NULL,
  metric STRING NOT NULL,
  source STRING NOT NULL,
  value FLOAT64 NOT NULL,
  date DATE NOT NULL,
  metadata JSON,
  created_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(date);
```

Inserted rows (per observation):
- `metric`: from `FRED_METRICS[].name`
- `value`: parsed `observations[i].value`
- `date`: `observations[i].date`
- `metadata`: JSON containing `series_id`, description, unit, category

## Deployment

Deploy function (also handled by `scripts/deploy-all-functions.sh`):
```bash
gcloud functions deploy fred-fetcher \
  --runtime nodejs24 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1 \
  --source src/functions \
  --entry-point fredDataFetcher \
  --set-env-vars FRED_API_KEY=$FRED_API_KEY,BIGQUERY_DATASET=$BIGQUERY_DATASET,BIGQUERY_TABLE=$BIGQUERY_TABLE,GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT
```

## Scheduling

Hourly Scheduler (created/updated by `scripts/deploy-all-functions.sh`):
```bash
gcloud scheduler jobs create http fred-ingestion-hourly \
  --schedule="0 * * * *" \
  --time-zone="UTC" \
  --uri="$(gcloud functions describe fred-fetcher --region=us-central1 --format='value(httpsTrigger.url)')" \
  --http-method=POST \
  --headers="Content-Type=application/json"
```

## Environment Variables

- `FRED_API_KEY` (required)
- `GOOGLE_CLOUD_PROJECT`, `GOOGLE_APPLICATION_CREDENTIALS`
- `BIGQUERY_DATASET` (default `direction_sky_data`)
- `BIGQUERY_TABLE` (default `fred_metrics`)
- Optional: `REDIS_URL`, `PROCESSING_LAYER_URL`

## Troubleshooting

- 403/401: verify `FRED_API_KEY`
- Empty observations: check `series_id` and date windows
- BigQuery insert errors: confirm dataset/table existence and service account roles


