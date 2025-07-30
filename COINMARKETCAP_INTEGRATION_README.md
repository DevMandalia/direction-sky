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
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point coinmarketcapDataFetcher
```

### API Response

The data fetcher returns a JSON response with:

```json
{
  "success": true,
  "timestamp": 1705312200000,
  "source": "coinmarketcap",
  "metricsProcessed": 1,
  "successfulFetches": 1,
  "failedFetches": 0,
  "successfulStores": 1,
  "failedStores": 0,
  "processingTime": 1250,
  "categories": ["sentiment"],
  "results": [
    {
      "metric": "fear_greed_index",
      "status": "success",
      "value": 75,
      "valueClassification": "Greed",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "storedInDatabase": true
    }
  ]
}
```

## Database Operations

### Get Latest Value

```typescript
import { databaseService } from '../services/databaseService';

const latestData = await databaseService.getLatestCoinMarketCapFearGreed();
console.log(`Current Fear & Greed Index: ${latestData.value} (${latestData.value_classification})`);
```

### Get Historical Data

```typescript
import { databaseService } from '../services/databaseService';

const historicalData = await databaseService.getHistoricalCoinMarketCapFearGreed({
  startTime: new Date('2024-01-01'),
  endTime: new Date('2024-01-15'),
  limit: 100
});
```

## Caching

The latest Fear and Greed Index value is cached in Redis for 30 minutes to reduce API calls and improve response times.

Cache key: `coinmarketcap:fear_greed:latest`

## Error Handling

The integration includes comprehensive error handling:

- **API Errors**: Handles rate limits, authentication errors, and network issues
- **Database Errors**: Handles BigQuery connection and insertion errors
- **Retry Logic**: Automatic retry with exponential backoff for transient failures
- **Graceful Degradation**: Continues operation even if some components fail

## Monitoring

Monitor the following metrics:

- API response times
- Error rates
- Database insertion success rates
- Cache hit rates
- API credit usage

## Rate Limits

CoinMarketCap API has rate limits based on your subscription plan:
- Basic: 10,000 calls/month
- Professional: 100,000 calls/month
- Enterprise: Custom limits

The Fear and Greed Index updates every hour, so plan your data fetching accordingly.

## Integration with Processing Layer

The data is automatically sent to the processing layer for:
- Trend analysis
- Sentiment correlation with other metrics
- Alert generation for extreme values
- Historical pattern analysis

## Troubleshooting

### Common Issues

1. **API Key Invalid**: Ensure your CoinMarketCap API key is valid and has the necessary permissions
2. **Rate Limit Exceeded**: Check your API usage and consider upgrading your plan
3. **Database Connection**: Verify BigQuery credentials and table permissions
4. **Redis Connection**: Check Redis connection string and network access

### Debug Mode

Enable debug logging by setting the log level:

```bash
export LOG_LEVEL=debug
```

## Future Enhancements

- Support for historical data fetching
- Integration with other CoinMarketCap endpoints
- Real-time webhook support
- Advanced sentiment analysis
- Custom alerting based on threshold values 