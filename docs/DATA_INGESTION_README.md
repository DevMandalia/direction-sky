# Data Ingestion Layer - Google Cloud Platform

This directory contains the serverless data ingestion layer for the Direction Sky crypto analytics platform. The layer is responsible for fetching data from external sources on a regular schedule and passing it to the Processing & Storage Layer.

## Architecture

The data ingestion layer uses Google Cloud Functions with Cloud Scheduler:

- **Schedulers (current)**:
  - Polygon options upsert: hourly during market hours, plus open/close jobs
    - Jobs defined in `scripts/setup-polygon-scheduler.js`
    - Names: `polygon-hourly-ingestion`, `polygon-market-open`, `polygon-market-close`
  - CoinMarketCap Fear & Greed: daily at 00:00 UTC
    - Job defined in `scripts/setup-coinmarketcap-scheduler.js` (name `coinmarketcap-daily`)
  - FRED and X: examples provided in `scripts/deploy-all-functions.sh` (both hourly)
- **Functions**: Individual Cloud Functions for each data source (FRED, X, Polygon, CoinMarketCap, Binance, Glassnode)
- **API Client**: Centralized utility for making API calls with retry logic and error handling
- **Data Flow**: Raw data is collected and sent to the Processing & Storage Layer

## Data Sources

### 1. Glassnode (On-chain Data) 
- **API**: https://api.glassnode.com
- **Metrics**: Active addresses, transaction count, network hash rate, exchange balance
- **Frequency**: Every 5 minutes
- **Authentication**: API key required

### 2. CoinGlass (Market Data)
- **API**: https://open-api.coinglass.com
- **Metrics**: Futures funding rates, open interest, long/short ratio, liquidations
- **Frequency**: Every 5 minutes
- **Authentication**: API key required

### 3. FRED (Economic Data)
- **API**: https://api.stlouisfed.org/fred
- **Metrics**: Federal funds rate, unemployment rate, GDP
- **Frequency**: Every 5 minutes
- **Authentication**: API key required

### 4. Binance (Price & Market Data)
- **API**: https://api.binance.com
- **Metrics**: 24hr ticker, klines/candlesticks, trades, order book depth
- **Frequency**: Every 5 minutes
- **Authentication**: Public API (no key required for basic data)

### 5. CoinMarketCap (Sentiment - Fear & Greed Index)
- **API**: https://pro-api.coinmarketcap.com/v1/tools/fear-greed-index
- **Metrics**: Fear & Greed value (0–100), classification, time until update
- **Frequency**: Daily at 00:00 UTC
- **Authentication**: API key required (`X-CMC_PRO_API_KEY`)

### 6. Polygon (Options & Equities)
- **API**: https://api.polygon.io
- **Metrics**: Options chain snapshots (calls/puts, strikes, expiries), underlying stock snapshots/prices
- **Frequency**: Hourly during market hours, plus market open/close jobs
- **Authentication**: API key required

### 7. X (Twitter) Sentiment
- **API**: https://developer.twitter.com/
- **Metrics**: Keyword/account tweet counts, sentiment scores, engagement (likes/retweets/replies), top tweets, keyword analysis
- **Frequency**: Hourly (example scheduler)
- **Authentication**: API key, API secret, Bearer token

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Google Cloud CLI

```bash
# macOS
brew install google-cloud-sdk

# Windows
# Download from https://cloud.google.com/sdk/docs/install

# Linux
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### 3. Authenticate with Google Cloud

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 4. Configure Environment Variables

Copy the example environment file and fill in your API keys:

```bash
cp env.example .env
```

Required environment variables:
- `GLASSNODE_API_KEY`: Your Glassnode API key
- `COINGLASS_API_KEY`: Your CoinGlass API key
- `FRED_API_KEY`: Your FRED API key
- `BINANCE_API_KEY`: Your Binance API key (optional for basic data)
- `BINANCE_SECRET_KEY`: Your Binance secret key (optional for basic data)
- `COINMARKETCAP_API_KEY`: Your CoinMarketCap API key
- `POLYGON_API_KEY`: Your Polygon API key
- `X_API_KEY`: Your X (Twitter) API key
- `X_API_SECRET`: Your X (Twitter) API secret
- `X_BEARER_TOKEN`: Your X (Twitter) Bearer token
- `PROCESSING_LAYER_URL`: URL of your processing layer endpoint

### 5. Deploy to Google Cloud

```bash
# Deploy Polygon-related functions
npm run deploy:polygon

# Configure Polygon schedulers (hourly + open/close)
npm run deploy:polygon-scheduler

# Configure CoinMarketCap daily scheduler
npm run deploy:coinmarketcap-scheduler

# (Optional) Deploy all functions and example schedulers
bash scripts/deploy-all-functions.sh
```

### 6. Monitor Logs

```bash
# View logs for the main data ingestion function
npm run logs
```

## Function Structure

### Main Orchestrator (`dataIngestion.ts`)
- Optional aggregate orchestrator for ad-hoc/manual aggregation across FRED, X, and Polygon
- Deployed as `data-ingestion`; not scheduled by default (no Cloud Scheduler job attached)
- Useful for manual tests or batch triggers; production scheduling uses source-specific functions below

### Individual Data Fetchers (Scheduled per source)
- `fredDataFetcher.ts`: Fetches economic indicators (hourly scheduler)
- `xDataFetcher.ts`: Fetches X sentiment (hourly scheduler)
- `polygonOptionsDataFetcher.ts`: Fetches/stores options and stock snapshots; exposes UI endpoints (hourly + market open/close schedulers)
- `coinmarketcapDataFetcher.ts`: Fetches Fear & Greed index (daily scheduler at 00:00 UTC)
- `binanceDataFetcher.ts`: Price/market data (utility)
- `glassnodeDataFetcher.ts`: On-chain metrics (utility)

### Utilities
- `apiClient.ts`: Centralized API client with retry logic
- `types/data.ts`: TypeScript interfaces and types

## Data Flow

1. **Scheduling**: Cloud Scheduler triggers specific functions on defined cadences (see Schedulers above)
2. **Collection**: Each data source fetches data from their respective APIs
3. **Processing**: Raw data is formatted and validated
4. **Transmission**: Data is sent to the Processing & Storage Layer (or BigQuery directly)
5. **Monitoring**: Logs and metrics are recorded for monitoring

## Error Handling

- **Retry Logic**: Automatic retry for transient errors (5xx, 429)
- **Graceful Degradation**: Individual source failures don't stop the entire process
- **Logging**: Comprehensive error logging for debugging
- **Monitoring**: Success/failure metrics for each data source

## Monitoring & Alerts

The system provides:
- Success/failure rates per data source
- Processing time metrics
- Data point counts
- Error details for failed requests

## Security

- API keys stored as environment variables in Cloud Functions
- IAM roles with minimal required permissions
- HTTPS for all API communications
- Input validation and sanitization

## Cost Optimization

- Cloud Functions timeout after 9 minutes (maximum)
- Memory allocation optimized per function
- Efficient API calls with proper caching headers
- Minimal data transfer to processing layer

## Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure all required API keys are set in environment variables
2. **Timeout Errors**: Check if API endpoints are responding slowly
3. **Rate Limiting**: Implement exponential backoff for rate-limited APIs
4. **Processing Layer Errors**: Verify the processing layer URL is correct and accessible
5. **Authentication Errors**: Ensure you're authenticated with `gcloud auth login`

### Debug Commands

```bash
# Test individual functions
npm run invoke

# View function logs
npm run logs

# Check function configuration
gcloud functions describe data-ingestion --region=us-central1

# List all functions
gcloud functions list --region=us-central1
```

## Google Cloud Services Used

- **Cloud Functions**: Serverless compute for data ingestion
- **Cloud Scheduler**: Cron-based scheduling for triggers
- **Cloud Build**: Automated deployment and building
- **Cloud Logging**: Centralized logging and monitoring

## Next Steps

1. **Processing Layer**: Implement the data processing and storage layer
2. **Monitoring**: Set up Cloud Monitoring dashboards and alerts
3. **Scaling**: Optimize function memory and timeout settings
4. **Data Validation**: Add schema validation for incoming data
5. **Caching**: Implement caching for frequently accessed data

## API Documentation

For detailed API documentation for each data source:
- [Glassnode API](https://docs.glassnode.com/)
- [CoinGlass API](https://coinglass.com/api)
- [FRED API](https://fred.stlouisfed.org/docs/api/)
- [Binance API](https://binance-docs.github.io/apidocs/spot/en/)
- [CoinMarketCap API](https://coinmarketcap.com/api/documentation/v1/)
- [Polygon API](https://polygon.io/docs)
- [X (Twitter) API](https://developer.twitter.com/en/docs/twitter-api)

## Migration from AWS

If you're migrating from AWS Lambda to Google Cloud Functions:

1. **Function Signatures**: Changed from AWS Lambda to Google Cloud Functions format
2. **Deployment**: Uses `gcloud` CLI instead of Serverless Framework
3. **Scheduling**: Uses Cloud Scheduler instead of EventBridge
4. **Environment Variables**: Set via `gcloud functions deploy --set-env-vars`
5. **Logging**: Uses Cloud Logging instead of CloudWatch 