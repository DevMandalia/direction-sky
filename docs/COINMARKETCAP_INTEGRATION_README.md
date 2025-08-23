# CoinMarketCap Fear and Greed Index Integration

This document describes the integration of CoinMarketCap's Fear and Greed Index API into the Direction Sky data ingestion layer.

## Overview

The CoinMarketCap Fear and Greed Index is a sentiment indicator that measures market sentiment on a scale of 0-100, where:
- 0-25: Extreme Fear
- 26-45: Fear
- 46-55: Neutral
- 56-75: Greed
- 76-100: Extreme Greed

## Features

- **Real-time Data Fetching**: Fetches the latest Fear and Greed Index value
- **BigQuery Storage**: Stores historical data in a dedicated BigQuery table
- **Redis Caching**: Caches latest values for fast retrieval
- **Error Handling**: Comprehensive error handling and retry logic
- **Processing Layer Integration**: Sends data to the processing layer for further analysis

## API Endpoint

- **URL**: `https://pro-api.coinmarketcap.com/v1/tools/fear-greed-index`
- **Method**: GET
- **Authentication**: API Key in `X-CMC_PRO_API_KEY` header

## Response Format

```json
{
  "data": {
    "value": 75,
    "value_classification": "Greed",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "time_until_update": 3600
  },
  "status": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "error_code": 0,
    "error_message": null,
    "elapsed": 12,
    "credit_count": 1,
    "notice": null
  }
}
```

## Database Schema

The data is stored in a BigQuery table called `coinmarketcap_fear_greed` with the following schema:

| Field | Type | Description |
|-------|------|-------------|
| timestamp | TIMESTAMP | When the data was recorded |
| value | INT64 | Fear and Greed Index value (0-100) |
| value_classification | STRING | Classification (Extreme Fear, Fear, Neutral, Greed, Extreme Greed) |
| time_until_update | INT64 | Seconds until next update |
| metadata | JSON | Additional metadata including API credits used |
| created_at | TIMESTAMP | When the record was created |

## Environment Variables

Add the following to your `.env` file:

```bash
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key_here
```

## Usage

### Running the Data Fetcher

```bash
# Test the data fetcher
node scripts/test-coinmarketcap.js

# Deploy as Google Cloud Function
gcloud functions deploy coinmarketcap-data-fetcher \
  --runtime nodejs24 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point coinmarketcapDataFetcher
```