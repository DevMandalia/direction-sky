# Data Ingestion Layer - Google Cloud Platform

This directory contains the serverless data ingestion layer for the Direction Sky crypto analytics platform. The layer is responsible for fetching data from external sources on a regular schedule and passing it to the Processing & Storage Layer.

## Architecture

The data ingestion layer uses Google Cloud Functions with Cloud Scheduler:

- **Scheduler**: Google Cloud Scheduler triggers the main data ingestion function every 5 minutes
- **Functions**: Individual Cloud Functions for each data source (Glassnode, CoinGlass, FRED, Binance)
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
- `PROCESSING_LAYER_URL`: URL of your processing layer endpoint

### 5. Deploy to Google Cloud

```bash
# Deploy using the automated script
npm run deploy:script

# Or deploy manually
npm run deploy:all
```

### 6. Monitor Logs

```bash
# View logs for the main data ingestion function
npm run logs
```

## Function Structure

### Main Orchestrator (`dataIngestion.ts`)
- Coordinates all data sources
- Runs every 5 minutes via Cloud Scheduler
- Aggregates results and sends to processing layer

### Individual Data Fetchers
- `glassnodeDataFetcher.ts`: Fetches on-chain metrics
- `coinglassDataFetcher.ts`: Fetches market data
- `fredDataFetcher.ts`: Fetches economic indicators
- `binanceDataFetcher.ts`: Fetches price and market data

### Utilities
- `apiClient.ts`: Centralized API client with retry logic
- `types/data.ts`: TypeScript interfaces and types

## Data Flow

1. **Scheduling**: Cloud Scheduler triggers `data-ingestion` function every 5 minutes
2. **Collection**: Each data source fetches data from their respective APIs
3. **Processing**: Raw data is formatted and validated
4. **Transmission**: Data is sent to the Processing & Storage Layer
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

## Migration from AWS

If you're migrating from AWS Lambda to Google Cloud Functions:

1. **Function Signatures**: Changed from AWS Lambda to Google Cloud Functions format
2. **Deployment**: Uses `gcloud` CLI instead of Serverless Framework
3. **Scheduling**: Uses Cloud Scheduler instead of EventBridge
4. **Environment Variables**: Set via `gcloud functions deploy --set-env-vars`
5. **Logging**: Uses Cloud Logging instead of CloudWatch 