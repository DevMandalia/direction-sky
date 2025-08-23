# X (Twitter) Social Sentiment Analysis Integration

## Overview

This module integrates X (Twitter) social sentiment analysis into the Direction Sky data ingestion pipeline. It tracks Bitcoin-related keywords, analyzes sentiment from influential accounts, and provides comprehensive engagement metrics for social intelligence.

## Features

### 🔍 Keyword Tracking
- **Bitcoin-related keywords**: bitcoin, btc, hodl, diamond hands, paper hands, buy, sell
- **Market sentiment terms**: bullish, bearish, moon, dump, pump, fomo, fud
- **Crypto ecosystem**: altcoin, crypto, cryptocurrency, blockchain, satoshi, halving
- **Trading terms**: mining, wallet, exchange, defi, nft, metaverse, web3

### 😊 Sentiment Analysis
- **Sentiment classification**: Positive, Negative, Neutral
- **Sentiment scoring**: 0.0 to 1.0 scale with confidence levels
- **Sentiment distribution**: Very positive, positive, neutral, negative, very negative
- **Keyword-based analysis**: Contextual sentiment based on crypto-specific terminology

### 👤 Account Monitoring
- **Influential accounts**: SBF_FTX, cz_binance, VitalikButerin, michael_saylor, jack
- **Crypto experts**: elonmusk, saylor, peter_schiff, maxkeiser, aantonop
- **Analysts**: naval, balajis, chamath, pomp, cryptokaleo, planb
- **Thought leaders**: woomonic, nic__carter, hasufl, matt_levine

### 📊 Engagement Metrics
- **Like counts**: Total likes across analyzed tweets
- **Retweet counts**: Total retweets and shares
- **Reply counts**: Total replies and conversations
- **Quote counts**: Total quote tweets and references
- **Engagement rates**: Calculated engagement percentages

## Architecture

### Data Flow
```
X (Twitter) API → X Data Fetcher → Sentiment Analysis → Database Storage → Processing Layer
```

### Components

#### 1. X Data Fetcher (`src/functions/xDataFetcher.ts`)
- **Search functionality**: Queries X API for Bitcoin-related content
- **Account monitoring**: Fetches tweets from target influential accounts
- **Data aggregation**: Combines search and account data
- **Sentiment processing**: Analyzes sentiment scores and distributions

#### 2. Database Integration (`src/services/databaseService.ts`)
- **X sentiment table**: Dedicated BigQuery table for sentiment data
- **Caching layer**: Redis caching for performance optimization
- **Data persistence**: Structured storage of sentiment metrics

#### 3. Type Definitions (`src/types/data.ts`)
- **XPost**: Individual tweet structure with metrics
- **XSentimentData**: Aggregated sentiment analysis results
- **XEngagementMetrics**: Engagement statistics
- **XKeywordAnalysis**: Keyword frequency and trending analysis

## API Endpoints

### X Sentiment Data Fetcher
```http
POST /x-sentiment
```

**Response:**
```json
{
  "success": true,
  "timestamp": 1703123456789,
  "source": "x_sentiment",
  "searchesProcessed": 1,
  "accountsProcessed": 5,
  "successfulFetches": 6,
  "successfulStores": 6,
  "processingTime": 4500,
  "aggregatedSentiment": {
    "overall_sentiment_score": 0.65,
    "overall_sentiment_label": "positive",
    "total_tweets_analyzed": 150,
    "sentiment_confidence": 0.82
  },
  "keywords": ["bitcoin", "btc", "hodl", "diamond hands", ...],
  "targetAccounts": ["SBF_FTX", "cz_binance", "VitalikButerin", ...]
}
```

### Main Data Ingestion (Updated)
```http
POST /data-ingestion
```

**Response includes X sentiment metrics:**
```json
{
  "success": true,
  "dataSources": {
    "fred": { "status": "success", "dataPoints": 35 },
    "x_sentiment": { "status": "success", "dataPoints": 25 }
  },
  "xSentimentMetrics": [
    "bitcoin_sentiment_score",
    "overall_sentiment_label",
    "total_tweets_analyzed",
    "positive_tweet_count",
    "negative_tweet_count",
    "neutral_tweet_count",
    "engagement_metrics",
    "keyword_frequency",
    "trending_keywords",
    "top_influential_tweets",
    "account_sentiment_analysis"
  ]
}
```

## Configuration

### Environment Variables
```bash
# X (Twitter) API Configuration
X_API_KEY=your_twitter_api_key_here
X_API_SECRET=your_twitter_api_secret_here
X_BEARER_TOKEN=your_bearer_token_here

# Database Configuration
GOOGLE_CLOUD_PROJECT=your_project_id
BIGQUERY_DATASET=direction_sky_data
BIGQUERY_TABLE=fred_metrics
REDIS_URL=redis://localhost:6379
```

### Keyword Configuration
```typescript
const BITCOIN_KEYWORDS = [
  'bitcoin', 'btc', 'hodl', 'diamond hands', 'paper hands', 'buy', 'sell',
  'bullish', 'bearish', 'moon', 'dump', 'pump', 'fomo', 'fud', 'altcoin',
  'crypto', 'cryptocurrency', 'blockchain', 'satoshi', 'halving', 'mining',
  'wallet', 'exchange', 'defi', 'nft', 'metaverse', 'web3', 'ethereum', 'eth'
];
```

### Target Accounts
```typescript
const TARGET_ACCOUNTS = [
  'SBF_FTX', 'cz_binance', 'VitalikButerin', 'michael_saylor', 'jack',
  'elonmusk', 'saylor', 'peter_schiff', 'maxkeiser', 'aantonop',
  'naval', 'balajis', 'chamath', 'pomp', 'cryptokaleo', 'planb',
  'woonomic', 'nic__carter', 'hasufl', 'matt_levine'
];
```

## Usage

### Running Tests
```bash
# Test X sentiment functionality
npm run test:x-sentiment

# Test integration with main pipeline
npm run test:ingestion

# Test individual components
npm run test:fred
npm run test:database
```

### Deployment
```bash
# Deploy all functions including X sentiment
npm run deploy:all

# Deploy individual X sentiment function
gcloud functions deploy x-sentiment-fetcher --runtime nodejs24 --trigger-http --allow-unauthenticated
```

### Local Development
```bash
# Start local development server
npm run dev

# Test with curl
curl -X POST http://localhost:8080/x-sentiment
curl -X POST http://localhost:8080/data-ingestion
```

## Data Schema

### X Sentiment Data Table
```sql
CREATE TABLE x_sentiment_data (
  timestamp TIMESTAMP REQUIRED,
  source STRING REQUIRED,
  query STRING REQUIRED,
  total_tweets INT64 REQUIRED,
  sentiment_analysis JSON REQUIRED,
  engagement_metrics JSON REQUIRED,
  keyword_analysis JSON REQUIRED,
  top_tweets JSON REQUIRED,
  metadata JSON REQUIRED,
  created_at TIMESTAMP REQUIRED
)
```

### Sentiment Analysis Structure
```json
{
  "sentiment_analysis": {
    "positive_count": 45,
    "negative_count": 12,
    "neutral_count": 33,
    "average_sentiment_score": 0.65,
    "sentiment_distribution": {
      "very_positive": 15,
      "positive": 30,
      "neutral": 33,
      "negative": 8,
      "very_negative": 4
    }
  }
}
```

### Engagement Metrics Structure
```json
{
  "engagement_metrics": {
    "total_likes": 12500,
    "total_retweets": 3200,
    "total_replies": 1800,
    "total_quotes": 450,
    "average_engagement_rate": 0.045
  }
}
```

## Monitoring and Analytics

### Key Metrics
- **Sentiment Score**: Overall market sentiment (0.0 - 1.0)
- **Engagement Volume**: Total interactions with Bitcoin content
- **Keyword Trends**: Most mentioned Bitcoin-related terms
- **Influencer Impact**: Sentiment from key accounts
- **Sentiment Shifts**: Changes in sentiment over time

### Alerting
- **Sentiment Thresholds**: Alert on significant sentiment changes
- **Engagement Spikes**: Monitor unusual activity levels
- **Keyword Surges**: Track trending terms and phrases
- **Account Activity**: Monitor influential account posts

## Future Enhancements

### Advanced Sentiment Analysis
- **Machine Learning Models**: Custom sentiment classifiers
- **Context Awareness**: Better understanding of crypto-specific language
- **Emotion Detection**: Fear, greed, excitement, panic detection
- **Sarcasm Detection**: Identify ironic or sarcastic posts

### Real-time Features
- **Streaming API**: Real-time tweet processing
- **Live Alerts**: Instant sentiment change notifications
- **WebSocket Integration**: Real-time dashboard updates
- **Event-driven Architecture**: Trigger actions on sentiment shifts

### Enhanced Analytics
- **Sentiment Correlation**: Link sentiment to price movements
- **Predictive Models**: Forecast market sentiment trends
- **Geographic Analysis**: Regional sentiment differences
- **Temporal Patterns**: Time-based sentiment analysis

### Integration Opportunities
- **Trading Signals**: Generate trading signals from sentiment
- **Risk Management**: Incorporate sentiment into risk models
- **Portfolio Optimization**: Use sentiment in allocation decisions
- **Market Timing**: Optimize entry/exit based on sentiment

## Troubleshooting

### Common Issues

#### API Rate Limits
```bash
# Check X API rate limits
curl -H "Authorization: Bearer $X_BEARER_TOKEN" \
  https://api.twitter.com/2/users/by/username/twitterdev
```

#### Database Connection Issues
```bash
# Test BigQuery connection
npm run test:database

# Check Redis connection
redis-cli ping
```

#### Sentiment Analysis Errors
- Verify keyword configuration
- Check sentiment scoring algorithms
- Validate input data format
- Monitor processing performance

### Debug Mode
```bash
# Enable debug logging
DEBUG=x-sentiment:* npm run test:x-sentiment

# Check function logs
gcloud functions logs read x-sentiment-fetcher --limit=50
```

## Contributing

### Development Guidelines
1. Follow TypeScript best practices
2. Add comprehensive error handling
3. Include unit tests for new features
4. Update documentation for API changes
5. Follow the existing code structure

### Testing Strategy
- Unit tests for individual functions
- Integration tests for API endpoints
- End-to-end tests for complete workflows
- Performance tests for scalability

## License

This module is part of the Direction Sky project and follows the same licensing terms.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review existing GitHub issues
3. Create a new issue with detailed information
4. Contact the development team

---

**Note**: This implementation currently uses mock data for demonstration purposes. Replace the mock X API client with real Twitter API v2 calls for production use. 