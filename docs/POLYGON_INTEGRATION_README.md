# Polygon.io Options, Stock, and Crypto Integration

This document describes the comprehensive integration of Polygon.io APIs into the Direction Sky data ingestion layer for real-time options, stock, and cryptocurrency data.

## 🎯 Overview

The Polygon.io integration provides access to comprehensive U.S. options market data, including real-time pricing, Greeks, volume, open interest, and bid/ask spreads. This integration covers:

- **MSTR Stock**: Real-time stock data + all available options contracts
- **BTC Crypto**: Real-time cryptocurrency data
- **Options Data**: All available strikes, expirations, Greeks, volume, bid/ask spreads

## 🏗️ Architecture

### **Dual-Layer Data Collection**
1. **Real-time Layer**: WebSocket connections for live pricing, Greeks, bid/ask, volume
2. **Batch Layer**: REST API calls every 5 minutes for historical data, open interest, etc.

### **Data Flow**
```
Polygon.io APIs → Data Fetcher → BigQuery Storage → Processing Layer
     ↓
WebSocket Streams → Real-time Cache → Immediate Processing
```

### **Components**
- `polygonOptionsDataFetcher.ts`: Main data collection function
- `polygonAPIClient.ts`: API client with REST + WebSocket support
- `polygonDatabaseService.ts`: BigQuery storage service
- `polygon.ts`: TypeScript interfaces and types

## 📊 Data Coverage

### **Options Data (MSTR)**
- **Contract Details**: Strike price, expiration, type (call/put), exercise style
- **Real-time Pricing**: Bid, ask, last trade price, bid/ask sizes
- **Greeks**: Delta, gamma, theta, vega, rho
- **Market Data**: Volume, open interest, implied volatility
- **Timestamps**: Quote time, trade time, participant time

### **Stock Data (MSTR)**
- **Quote Data**: Bid, ask, bid size, ask size
- **Trade Data**: Last price, last size, exchange
- **Market Data**: Volume, VWAP, OHLC (previous day)
- **Timestamps**: Quote time, trade time, update time

### **Crypto Data (BTC)**
- **Quote Data**: Bid, ask, bid size, ask size
- **Trade Data**: Last price, last size, exchange
- **Market Data**: Volume, VWAP, OHLC (previous day)
- **Timestamps**: Quote time, trade time, update time

## 🚀 Getting Started

### **Prerequisites**
1. Polygon.io API key ([Get one here](https://polygon.io/))
2. Google Cloud Platform account
3. BigQuery dataset setup
4. Node.js 18+ and npm

### **1. Environment Configuration**
Add to your `.env` file:
```bash
POLYGON_API_KEY=your_polygon_api_key_here
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_REGION=us-central1
BIGQUERY_DATASET=direction_sky_data
PROCESSING_LAYER_URL=https://your-processing-layer-url.com/api/ingest
```

### **2. Install Dependencies**
```bash
npm install axios ws @types/ws @google-cloud/bigquery
```

### **3. Deploy Functions**
```bash
# Deploy Polygon.io functions
node scripts/deploy-polygon.js

# Setup Cloud Scheduler
node scripts/setup-polygon-scheduler.js
```

## ⚙️ Configuration

### **Asset Configuration**
```typescript
const assets: AssetConfig[] = [
  {
    symbol: 'MSTR',
    asset_type: 'stock',
    options_enabled: true,      // Enable options data collection
    real_time_enabled: true,    // Enable WebSocket real-time data
    batch_enabled: true         // Enable 5-minute batch collection
  },
  {
    symbol: 'BTC',
    asset_type: 'crypto',
    options_enabled: false,     // BTC doesn't have traditional options
    real_time_enabled: true,    // Enable real-time crypto data
    batch_enabled: true         // Enable batch collection
  }
];
```

### **API Configuration**
```typescript
const polygonConfig: PolygonConfig = {
  apiKey: process.env.POLYGON_API_KEY,
  baseUrl: 'https://api.polygon.io',
  wsUrl: 'wss://delayed.polygon.io/stocks', // Use real-time for production
  retryAttempts: 3,
  retryDelay: 1000,
  realTimeEnabled: true,
  batchEnabled: true,
  cacheEnabled: true,
  cacheTTL: 300000 // 5 minutes
};
```

## 📅 Scheduling

### **Market Hours Schedule**
- **Batch Collection**: Every 5 minutes during market hours (9:30 AM - 4:00 PM ET)
- **Market Open**: 9:30 AM ET (special collection)
- **Market Close**: 4:00 PM ET (special collection)
- **Real-time Data**: Continuous WebSocket streaming during market hours

### **Cloud Scheduler Jobs**
1. **`polygon-batch-ingestion`**: Every 5 minutes during market hours
2. **`polygon-market-open`**: 9:30 AM ET daily
3. **`polygon-market-close`**: 4:00 PM ET daily

## 💾 Data Storage

### **BigQuery Tables**
1. **`polygon_options`**: All options contract data
2. **`polygon_stocks`**: Stock market data
3. **`polygon_crypto`**: Cryptocurrency data
4. **`polygon_realtime`**: Real-time streaming data

### **Schema Features**
- **Optimized for Time-Series**: Timestamp-based partitioning
- **Full Data Preservation**: Raw JSON data stored alongside structured fields
- **Efficient Querying**: Indexed on underlying_asset, contract_id, timestamp
- **Scalable**: Handles millions of options contracts

## 🔄 Real-time Data Streaming

### **WebSocket Subscriptions**
- **Stock Trades**: `T.MSTR` (MSTR trades)
- **Stock Quotes**: `Q.MSTR` (MSTR quotes)
- **Crypto Trades**: `XT.BTC` (BTC trades)
- **Crypto Quotes**: `XQ.BTC` (BTC quotes)
- **Options Trades**: `OT.MSTR` (MSTR options trades)
- **Options Quotes**: `OQ.MSTR` (MSTR options quotes)
- **Options Greeks**: `OG.MSTR` (MSTR options Greeks)

### **Real-time Processing**
- **Immediate Storage**: Real-time data stored in BigQuery
- **Processing Layer**: Data sent to processing layer immediately
- **Smart Caching**: Redis-based caching for frequently accessed data
- **Fallback Handling**: Automatic fallback to REST API if WebSocket fails

## 📈 Data Analysis Examples

### **Options Chain Analysis**
```sql
-- Get all MSTR options for a specific expiration
SELECT 
  contract_type,
  strike_price,
  bid,
  ask,
  delta,
  gamma,
  theta,
  vega,
  implied_volatility,
  volume,
  open_interest
FROM `direction_sky_data.polygon_options`
WHERE underlying_asset = 'MSTR'
  AND expiration_date = '2024-02-16'
ORDER BY strike_price, contract_type;
```

### **Real-time Price Monitoring**
```sql
-- Get latest MSTR stock price
SELECT 
  ticker,
  last_price,
  bid,
  ask,
  timestamp
FROM `direction_sky_data.polygon_stocks`
WHERE ticker = 'MSTR'
ORDER BY timestamp DESC
LIMIT 1;
```

### **Options Greeks Analysis**
```sql
-- Monitor Greeks changes over time
SELECT 
  timestamp,
  contract_id,
  delta,
  gamma,
  theta,
  vega,
  implied_volatility
FROM `direction_sky_data.polygon_realtime`
WHERE underlying_asset = 'MSTR'
  AND event_type = 'G'
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
ORDER BY timestamp DESC;
```

## 🚨 Error Handling & Monitoring

### **Automatic Retry Logic**
- **API Failures**: 3 retry attempts with exponential backoff
- **Rate Limiting**: Automatic 1-second delays on 429 responses
- **WebSocket Reconnection**: 5 reconnection attempts with increasing delays
- **Graceful Degradation**: Falls back to REST API if WebSocket fails

### **Monitoring & Alerts**
```bash
# View function logs
gcloud functions logs read polygon-options-fetcher --limit=100

# Check scheduler status
gcloud scheduler jobs list --location=us-central1

# Monitor BigQuery data ingestion
bq query "SELECT COUNT(*) as total_records FROM \`direction_sky_data.polygon_options\`"
```

## 🔧 Troubleshooting

### **Common Issues**

1. **API Key Invalid**
   ```
   Error: POLYGON_API_KEY environment variable is required
   ```
   **Solution**: Verify your API key in the environment variables

2. **WebSocket Connection Failed**
   ```
   Error connecting to WebSocket: ECONNREFUSED
   ```
   **Solution**: Check network connectivity and firewall settings

3. **BigQuery Permission Denied**
   ```
   Error: Access Denied: Project does not have BigQuery API enabled
   ```
   **Solution**: Enable BigQuery API in Google Cloud Console

4. **Rate Limiting**
   ```
   Error: 429 Too Many Requests
   ```
   **Solution**: The system automatically handles this with retries

### **Debug Mode**
Enable detailed logging by setting:
```bash
export DEBUG=polygon:*
```

## 📚 API Reference

### **Polygon.io Endpoints Used**
- **Options Contract Snapshot**: `/v3/snapshot/options/{underlyingAsset}/{optionContract}`
- **Options Chain Snapshot**: `/v3/snapshot/options/{underlyingAsset}`
- **Unified Options Snapshot**: `/v3/snapshot/options/{underlyingAsset}/unified`
- **Stock Snapshot**: `/v2/snapshot/locale/us/markets/stocks/tickers/{ticker}`
- **Crypto Snapshot**: `/v2/snapshot/locale/global/markets/crypto/tickers/{ticker}`

### **WebSocket Channels**
- **Stocks**: `T.{symbol}`, `Q.{symbol}`
- **Crypto**: `XT.{symbol}`, `XQ.{symbol}`
- **Options**: `OT.{symbol}`, `OQ.{symbol}`, `OG.{symbol}`

## 🔮 Future Enhancements

### **Planned Features**
1. **Historical Data**: Backfill historical options data
2. **Advanced Analytics**: Implied volatility surface analysis
3. **Risk Metrics**: Portfolio risk calculations
4. **Market Microstructure**: Order book depth analysis
5. **Multi-Asset Support**: Additional stocks and crypto pairs

### **Performance Optimizations**
1. **Data Compression**: Efficient storage of time-series data
2. **Query Optimization**: Materialized views for common queries
3. **Caching Strategy**: Multi-level caching for real-time data
4. **Load Balancing**: Multiple API endpoints for high availability

## 📞 Support

### **Resources**
- [Polygon.io Documentation](https://polygon.io/docs/)
- [Google Cloud Functions](https://cloud.google.com/functions/docs)
- [BigQuery Documentation](https://cloud.google.com/bigquery/docs)

### **Contact**
For technical support or questions about this integration:
- Check the logs: `gcloud functions logs read polygon-options-fetcher`
- Review BigQuery data: Check the `polygon_*` tables
- Verify API connectivity: Test the health check endpoint

---

**Note**: This integration provides comprehensive access to U.S. options market data. Ensure compliance with your data usage agreements and regulatory requirements. 