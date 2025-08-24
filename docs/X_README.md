# X (Twitter) Sentiment Integration

## Overview
- Bitcoin-focused sentiment analysis: keyword tracking, influential accounts, engagement metrics, trending terms.
- Ingestion via Cloud Function `x-fetcher`, storage in BigQuery, optional Redis caching.

## Setup
### API Credentials
1. Apply at https://developer.twitter.com/ and create an App.
2. Collect API Key, API Secret, and Bearer Token.
3. Add to `.env`:
```bash
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret
X_BEARER_TOKEN=your_bearer_token
```

### Environment
```bash
GOOGLE_CLOUD_PROJECT=your_project
BIGQUERY_DATASET=direction_sky_data
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
```

## Features
- Keyword tracking (bitcoin, btc, hodl, etc.)
- Sentiment scoring (0–1) with confidence
- Account monitoring (e.g., SBF_FTX, cz_binance, VitalikButerin, elonmusk, etc.)
- Engagement aggregation (likes, retweets, replies, quotes)

## Architecture
```
X API → xDataFetcher → Sentiment processing → BigQuery → (optional) Redis → Processing Layer
```
- Function: `src/functions/xDataFetcher.ts`
- Storage service: `src/functions/services/databaseService.js`

## BigQuery Storage
- Dataset: `direction_sky_data`
- Table: `x_sentiment_data` (partitioned by DATE(timestamp))

Schema:
```sql
CREATE TABLE `direction_sky_data.x_sentiment_data` (
  timestamp TIMESTAMP NOT NULL,
  source STRING NOT NULL,         -- 'x_search' | 'x_account'
  query STRING NOT NULL,          -- search query or account name
  total_tweets INT64 NOT NULL,
  sentiment_analysis JSON NOT NULL,
  engagement_metrics JSON NOT NULL,
  keyword_analysis JSON NOT NULL,
  top_tweets JSON NOT NULL,
  metadata JSON NOT NULL,
  created_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(timestamp)
```

## Configuration
- Keywords and Accounts are defined in the function; adjust as needed.

## Usage
- Deploy function:
```bash
gcloud functions deploy x-fetcher \
  --runtime nodejs24 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1 \
  --source src/functions \
  --entry-point xDataFetcher \
  --set-env-vars X_API_KEY=$X_API_KEY,X_API_SECRET=$X_API_SECRET,X_BEARER_TOKEN=$X_BEARER_TOKEN
```
- Test locally:
```bash
npm run test:x-sentiment
```

## Query Examples
- Latest sentiment:
```sql
SELECT timestamp, sentiment_analysis, engagement_metrics, total_tweets
FROM `direction_sky_data.x_sentiment_data`
WHERE query = 'bitcoin_search'
ORDER BY timestamp DESC
LIMIT 1;
```
- 7-day trend:
```sql
SELECT DATE(timestamp) AS date,
  AVG(CAST(JSON_EXTRACT_SCALAR(sentiment_analysis, '$.average_sentiment_score') AS FLOAT64)) AS avg_sentiment,
  SUM(total_tweets) AS total_tweets
FROM `direction_sky_data.x_sentiment_data`
WHERE source = 'x_search'
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY date
ORDER BY date;
```

## Troubleshooting
- Invalid/expired token: regenerate Bearer Token
- Rate limit exceeded: retry after window; monitor tiers
- Permissions: ensure BigQuery roles for service account

## Notes
- Do not commit secrets. Rotate tokens periodically.
