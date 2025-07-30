# X Data Storage in BigQuery - Complete Guide

## 🗄️ **BigQuery Table Structure**

### **Table Details**
- **Dataset**: `direction_sky_data`
- **Table**: `x_sentiment_data`
- **Partitioning**: By day (timestamp field)
- **Location**: Your Google Cloud project

### **Schema Definition**

```sql
CREATE TABLE `direction_sky_data.x_sentiment_data` (
  `timestamp` TIMESTAMP NOT NULL,
  `source` STRING NOT NULL,
  `query` STRING NOT NULL,
  `total_tweets` INT64 NOT NULL,
  `sentiment_analysis` JSON NOT NULL,
  `engagement_metrics` JSON NOT NULL,
  `keyword_analysis` JSON NOT NULL,
  `top_tweets` JSON NOT NULL,
  `metadata` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL
)
PARTITION BY DATE(timestamp)
```

## 📊 **Data Structure Examples**

### **1. Sentiment Analysis JSON**
```json
{
  "positive_count": 45,
  "negative_count": 23,
  "neutral_count": 32,
  "average_sentiment_score": 0.67,
  "sentiment_distribution": {
    "very_positive": 12,
    "positive": 33,
    "neutral": 32,
    "negative": 18,
    "very_negative": 5
  }
}
```

### **2. Engagement Metrics JSON**
```json
{
  "total_likes": 15420,
  "total_retweets": 2341,
  "total_replies": 892,
  "total_quotes": 567,
  "average_engagement_rate": 0.085
}
```

### **3. Keyword Analysis JSON**
```json
{
  "keyword_frequency": {
    "bitcoin": 156,
    "btc": 89,
    "hodl": 34,
    "moon": 23,
    "bullish": 18
  },
  "trending_keywords": ["bitcoin", "btc", "hodl", "moon", "bullish"]
}
```

### **4. Top Tweets JSON**
```json
[
  {
    "id": "1234567890123456789",
    "text": "Bitcoin is the future of money! 🚀",
    "author_username": "crypto_expert",
    "public_metrics": {
      "like_count": 1234,
      "retweet_count": 567,
      "reply_count": 89,
      "quote_count": 45
    },
    "sentiment": {
      "score": 0.85,
      "label": "positive"
    }
  }
]
```

### **5. Metadata JSON**
```json
{
  "metric_name": "bitcoin_search",
  "stored_at": 1703123456789,
  "processing_time": 1250,
  "keywords_tracked": ["bitcoin", "btc", "hodl", "diamond hands", "paper hands"],
  "accounts_monitored": ["SBF_FTX", "cz_binance", "VitalikButerin"]
}
```

## 🔄 **Data Flow Process**

### **Step 1: Data Collection**
```typescript
// X Data Fetcher collects tweets
const bitcoinTweets = await xApiClient.searchTweets('bitcoin OR btc OR hodl', 100);
const userTweets = await xApiClient.getUserTweets('SBF_FTX', 50);
```

### **Step 2: Data Processing**
```typescript
// Process sentiment and engagement
const sentimentData = {
  source: 'x_search',
  query: 'bitcoin OR btc OR hodl',
  timestamp: Date.now(),
  total_tweets: bitcoinTweets.data.length,
  sentiment_analysis: { /* calculated metrics */ },
  engagement_metrics: { /* aggregated metrics */ },
  keyword_analysis: { /* keyword frequency */ },
  top_tweets: [ /* top performing tweets */ ]
};
```

### **Step 3: BigQuery Storage**
```typescript
// Store in BigQuery
await databaseService.storeXData(sentimentData, 'bitcoin_search');
```

### **Step 4: Redis Caching**
```typescript
// Cache latest sentiment score
await redisClient.setex(
  'x_sentiment:bitcoin_search:latest',
  1800, // 30 minutes
  JSON.stringify({
    sentiment_score: 0.67,
    total_tweets: 100,
    timestamp: Date.now()
  })
);
```

## 📈 **Query Examples**

### **1. Get Latest Sentiment Data**
```sql
SELECT 
  timestamp,
  sentiment_analysis,
  engagement_metrics,
  total_tweets
FROM `direction_sky_data.x_sentiment_data`
WHERE query = 'bitcoin_search'
ORDER BY timestamp DESC
LIMIT 1
```

### **2. Sentiment Trend Analysis**
```sql
SELECT 
  DATE(timestamp) as date,
  AVG(CAST(JSON_EXTRACT_SCALAR(sentiment_analysis, '$.average_sentiment_score') AS FLOAT64)) as avg_sentiment,
  SUM(total_tweets) as total_tweets
FROM `direction_sky_data.x_sentiment_data`
WHERE source = 'x_search'
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY date
ORDER BY date
```

### **3. Engagement Metrics Over Time**
```sql
SELECT 
  DATE(timestamp) as date,
  SUM(CAST(JSON_EXTRACT_SCALAR(engagement_metrics, '$.total_likes') AS INT64)) as total_likes,
  SUM(CAST(JSON_EXTRACT_SCALAR(engagement_metrics, '$.total_retweets') AS INT64)) as total_retweets,
  SUM(CAST(JSON_EXTRACT_SCALAR(engagement_metrics, '$.total_replies') AS INT64)) as total_replies
FROM `direction_sky_data.x_sentiment_data`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY date
ORDER BY date
```

### **4. Top Keywords Analysis**
```sql
SELECT 
  JSON_EXTRACT_SCALAR(keyword_analysis, '$.trending_keywords') as trending_keywords,
  timestamp
FROM `direction_sky_data.x_sentiment_data`
WHERE source = 'x_search'
ORDER BY timestamp DESC
LIMIT 10
```

### **5. Account Performance Comparison**
```sql
SELECT 
  query as account_name,
  AVG(CAST(JSON_EXTRACT_SCALAR(sentiment_analysis, '$.average_sentiment_score') AS FLOAT64)) as avg_sentiment,
  SUM(total_tweets) as total_tweets_analyzed
FROM `direction_sky_data.x_sentiment_data`
WHERE source = 'x_account'
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY query
ORDER BY avg_sentiment DESC
```

## 🚀 **How to Access Your Data**

### **1. BigQuery Console**
1. Go to [BigQuery Console](https://console.cloud.google.com/bigquery)
2. Navigate to your project
3. Find dataset: `direction_sky_data`
4. Find table: `x_sentiment_data`
5. Click "Query" to run SQL queries

### **2. Programmatic Access**
```typescript
// Get latest sentiment data
const latestSentiment = await databaseService.getLatestXSentiment('bitcoin_search');

// Query historical data
const query = `
  SELECT * FROM \`direction_sky_data.x_sentiment_data\`
  WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  ORDER BY timestamp DESC
`;
```

### **3. Redis Cache Access**
```typescript
// Get cached sentiment score
const cached = await redisClient.get('x_sentiment:bitcoin_search:latest');
if (cached) {
  const data = JSON.parse(cached);
  console.log('Latest sentiment score:', data.sentiment_score);
}
```

## 📊 **Data Types Stored**

### **Search Data** (`source = 'x_search'`)
- **Query**: `'bitcoin OR btc OR hodl OR "diamond hands" OR "paper hands"'`
- **Content**: General Bitcoin-related tweets
- **Frequency**: Every time the function runs

### **Account Data** (`source = 'x_account'`)
- **Query**: Account usernames (e.g., `'SBF_FTX'`, `'cz_binance'`)
- **Content**: Tweets from specific influential accounts
- **Frequency**: Every time the function runs (limited to 5 accounts per run)

## 🔧 **Configuration**

### **Environment Variables**
```bash
# BigQuery Configuration
GOOGLE_CLOUD_PROJECT=dev-epsilon-467101-v2
BIGQUERY_DATASET=direction_sky_data
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json

# X API Configuration
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret
X_BEARER_TOKEN=your_bearer_token
```

### **Table Creation**
The table is automatically created when you first run the X data fetcher:
```typescript
await databaseService.initializeXTable();
```

## 📈 **Monitoring & Analytics**

### **Key Metrics to Track**
1. **Sentiment Trends**: Average sentiment scores over time
2. **Engagement Rates**: Likes, retweets, replies per tweet
3. **Keyword Evolution**: Trending keywords and their frequency
4. **Account Influence**: Sentiment impact of specific accounts
5. **Volume Analysis**: Number of tweets analyzed per time period

### **Alerting Possibilities**
- Sentiment score drops below threshold
- Engagement rate spikes
- New trending keywords detected
- Account sentiment shifts significantly

---

## 🎯 **Next Steps**

1. **Run the X Data Fetcher**: `npm run test:x-sentiment`
2. **Check BigQuery**: Verify data is being stored
3. **Create Dashboards**: Build visualizations for sentiment trends
4. **Set Up Alerts**: Monitor for significant sentiment changes
5. **Scale Up**: Add more accounts and keywords

Your X data storage is fully operational and ready for production use! 🚀 