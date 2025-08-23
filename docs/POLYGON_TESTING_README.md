# Polygon Fetcher Testing Guide

This guide explains how to test the Polygon.io options data fetcher to ensure it's working correctly with API calls and BigQuery data storage.

## Overview

The polygon fetcher is designed to:
1. **Fetch options chain data** from Polygon.io API
2. **Fetch stock data** for specified symbols
3. **Fetch crypto data** for crypto assets
4. **Store all data** in BigQuery tables
5. **Handle errors gracefully** and provide detailed logging

## Prerequisites

Before testing, ensure you have:

1. **Polygon.io API Key** - Get one from [Polygon.io](https://polygon.io/)
2. **Google Cloud Project** with BigQuery enabled
3. **Service Account Key** with BigQuery permissions
4. **Node.js** version 23+ installed

## Environment Setup

Create a `.env` file in the root directory with:

```bash
# API Keys
POLYGON_API_KEY=your_polygon_api_key_here

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account-key.json

# BigQuery Configuration
BIGQUERY_DATASET=direction_sky_data
```

## Test Scripts

### 1. Complete Integration Test (`test-polygon-complete.js`)

This is the most comprehensive test that verifies the entire system:

```bash
node test-polygon-complete.js
```

**What it tests:**
- ✅ Environment configuration
- ✅ Polygon API connectivity
- ✅ Options chain data fetching
- ✅ Stock data fetching
- ✅ BigQuery table operations
- ✅ Data storage and retrieval
- ✅ End-to-end workflow

**Expected output:**
```
🚀 Starting Complete Polygon Fetcher Tests...

============================================================
  Environment Configuration Test
============================================================
✅ All required environment variables are set
ℹ️  Google Cloud Project: dev-epsilon-467101-v2
ℹ️  BigQuery Dataset: direction_sky_data
ℹ️  Polygon API Key: ✓ Set

============================================================
  Polygon API Connectivity Test
============================================================
✅ Polygon API connectivity test passed
ℹ️  API Status: OK
ℹ️  Request ID: abc123...

============================================================
  Options Chain Data Fetching Test
============================================================
ℹ️  Fetching options chain for MSTR...
✅ Successfully fetched options chain for MSTR
ℹ️  Response status: OK
ℹ️  Results count: 150
ℹ️  Calls available: 75
ℹ️  Puts available: 75
ℹ️  Sample call contract: MSTR240119C00100000
ℹ️  Sample call strike: $100.0
ℹ️  Sample call expiration: 2024-01-19

============================================================
  Test Results Summary
============================================================
✅ environment: PASSED
✅ apiConnectivity: PASSED
✅ optionsChain: PASSED
✅ stockData: PASSED
✅ bigQueryOperations: PASSED
✅ dataStorage: PASSED
✅ endToEnd: PASSED

Overall: 7/7 tests passed

🎉 All tests passed! The polygon fetcher is working correctly.
```

### 2. Function Test (`test-polygon-function.js`)

Tests the Cloud Function directly:

```bash
node test-polygon-function.js
```

**What it tests:**
- ✅ Function import and execution
- ✅ API calls to Polygon.io
- ✅ Response handling
- ✅ Health check functionality

### 3. Jest Test (`test-polygon-fetcher.js`)

Unit tests using Jest framework:

```bash
npm test test-polygon-fetcher.js
```

## Manual Testing

### Test API Connectivity

```bash
curl -X GET "https://api.polygon.io/v3/reference/tickers?market=stocks&active=true&limit=1&apiKey=YOUR_API_KEY"
```

### Test Options Chain

```bash
curl -X GET "https://api.polygon.io/v3/snapshot/options/MSTR?apiKey=YOUR_API_KEY"
```

### Test Stock Data

```bash
curl -X GET "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/MSTR?apiKey=YOUR_API_KEY"
```

## BigQuery Verification

After running tests, verify data is stored correctly:

### Check Tables Exist

```sql
SELECT table_id, creation_time 
FROM `your-project.direction_sky_data.__TABLES__` 
WHERE table_id LIKE 'polygon_%'
```

### Query Options Data

```sql
SELECT 
  underlying_asset,
  contract_type,
  strike_price,
  expiration_date,
  bid,
  ask,
  volume,
  open_interest,
  created_at
FROM `your-project.direction_sky_data.polygon_options`
WHERE underlying_asset = 'MSTR'
ORDER BY created_at DESC
LIMIT 10
```

### Query Stock Data

```sql
SELECT 
  ticker,
  last_price,
  bid,
  ask,
  volume,
  created_at
FROM `your-project.direction_sky_data.polygon_stocks`
WHERE ticker = 'MSTR'
ORDER BY created_at DESC
LIMIT 5
```

## Troubleshooting

### Common Issues

1. **Missing API Key**
   ```
   ❌ POLYGON_API_KEY environment variable not set
   ```
   **Solution:** Set the environment variable in your `.env` file

2. **BigQuery Permission Denied**
   ```
   ❌ BigQuery operations test failed: Access Denied
   ```
   **Solution:** Ensure your service account has BigQuery Admin or Data Editor permissions

3. **API Rate Limiting**
   ```
   ❌ Polygon API connectivity test failed: Too Many Requests
   ```
   **Solution:** The fetcher includes rate limiting (1 second delay between calls)

4. **Network Issues**
   ```
   ❌ Polygon API connectivity test failed: connect ECONNREFUSED
   ```
   **Solution:** Check your internet connection and firewall settings

### Debug Mode

Enable detailed logging by setting:

```bash
export DEBUG=polygon:*
```

## Performance Testing

### Test with Multiple Assets

```javascript
const testAssets = [
  { symbol: 'MSTR', asset_type: 'stock', options_enabled: true },
  { symbol: 'SPY', asset_type: 'stock', options_enabled: true },
  { symbol: 'AAPL', asset_type: 'stock', options_enabled: true },
  { symbol: 'TSLA', asset_type: 'stock', options_enabled: true },
  { symbol: 'BTC', asset_type: 'crypto', options_enabled: false }
];
```

### Monitor API Usage

Check your Polygon.io dashboard for:
- API call count
- Rate limit usage
- Data volume

## Expected Results

When working correctly, you should see:

1. **API Responses:** 200 status codes with data
2. **BigQuery Tables:** Created automatically with proper schemas
3. **Data Storage:** Options, stock, and crypto data stored successfully
4. **Error Handling:** Graceful fallbacks for failed requests
5. **Logging:** Detailed console output for debugging

## Next Steps

After successful testing:

1. **Deploy to Cloud Functions:**
   ```bash
   npm run deploy:polygon
   ```

2. **Set up Cloud Scheduler:**
   ```bash
   npm run deploy:polygon-scheduler
   ```

3. **Monitor in Production:**
   ```bash
   npm run logs:polygon
   ```

## Support

If you encounter issues:

1. Check the console output for error messages
2. Verify environment variables are set correctly
3. Ensure API keys are valid and have proper permissions
4. Check BigQuery permissions and quotas
5. Review the Polygon.io API documentation for endpoint changes

---

**Note:** This testing suite is designed to be comprehensive and safe. It creates temporary test tables and cleans them up automatically to avoid cluttering your BigQuery dataset. 