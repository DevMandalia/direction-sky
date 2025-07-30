#!/usr/bin/env node

require('dotenv').config();
const { DatabaseService } = require('../dist/services/databaseService');

async function queryXData() {
  console.log('🔍 Querying X Sentiment Data from BigQuery...\n');

  try {
    // Initialize database service
    const db = new DatabaseService({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      datasetId: process.env.BIGQUERY_DATASET,
      tableId: process.env.BIGQUERY_TABLE
    });

    // 1. Get latest sentiment data
    console.log('📊 1. Latest Sentiment Data:');
    const latestSentiment = await db.getLatestXSentiment('bitcoin_search');
    if (latestSentiment) {
      console.log('   ✅ Found latest sentiment data:');
      console.log(`   📅 Timestamp: ${new Date(latestSentiment.timestamp).toLocaleString()}`);
      console.log(`   📈 Average Sentiment Score: ${latestSentiment.sentiment_analysis.average_sentiment_score.toFixed(3)}`);
      console.log(`   📊 Total Tweets Analyzed: ${latestSentiment.total_tweets}`);
      console.log(`   😊 Positive: ${latestSentiment.sentiment_analysis.positive_count}`);
      console.log(`   😞 Negative: ${latestSentiment.sentiment_analysis.negative_count}`);
      console.log(`   😐 Neutral: ${latestSentiment.sentiment_analysis.neutral_count}`);
    } else {
      console.log('   ⚠️  No sentiment data found yet. Run the X data fetcher first.');
    }

    // 2. Query BigQuery directly for more detailed analysis
    console.log('\n📈 2. Detailed BigQuery Analysis:');
    
    const bigquery = db.bigquery;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const datasetId = process.env.BIGQUERY_DATASET;

    // Count total records
    const countQuery = `
      SELECT COUNT(*) as total_records
      FROM \`${projectId}.${datasetId}.x_sentiment_data\`
    `;
    
    const [countResult] = await bigquery.query({ query: countQuery });
    const totalRecords = countResult[0].total_records;
    console.log(`   📊 Total records in table: ${totalRecords}`);

    if (totalRecords > 0) {
      // Get recent sentiment trends
      const trendQuery = `
        SELECT 
          DATE(timestamp) as date,
          source,
          query,
          total_tweets,
          CAST(JSON_EXTRACT_SCALAR(sentiment_analysis, '$.average_sentiment_score') AS FLOAT64) as avg_sentiment,
          CAST(JSON_EXTRACT_SCALAR(engagement_metrics, '$.total_likes') AS INT64) as total_likes,
          CAST(JSON_EXTRACT_SCALAR(engagement_metrics, '$.total_retweets') AS INT64) as total_retweets
        FROM \`${projectId}.${datasetId}.x_sentiment_data\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        ORDER BY timestamp DESC
        LIMIT 10
      `;

      const [trendResults] = await bigquery.query({ query: trendQuery });
      
      console.log('\n   📅 Recent Data (Last 7 days):');
      trendResults.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.date} | ${row.source} | ${row.query}`);
        console.log(`      📊 Tweets: ${row.total_tweets} | Sentiment: ${row.avg_sentiment?.toFixed(3) || 'N/A'}`);
        console.log(`      ❤️  Likes: ${row.total_likes || 0} | 🔄 Retweets: ${row.total_retweets || 0}`);
      });

      // Get keyword analysis
      const keywordQuery = `
        SELECT 
          JSON_EXTRACT_SCALAR(keyword_analysis, '$.trending_keywords') as trending_keywords,
          timestamp
        FROM \`${projectId}.${datasetId}.x_sentiment_data\`
        WHERE source = 'x_search'
        ORDER BY timestamp DESC
        LIMIT 5
      `;

      const [keywordResults] = await bigquery.query({ query: keywordQuery });
      
      console.log('\n   🔍 Recent Trending Keywords:');
      keywordResults.forEach((row, index) => {
        const keywords = JSON.parse(row.trending_keywords || '[]');
        console.log(`   ${index + 1}. ${new Date(row.timestamp.value || row.timestamp).toLocaleDateString()}: ${keywords.join(', ')}`);
      });

    } else {
      console.log('   ⚠️  No data found in the table yet.');
      console.log('   💡 Run the X data fetcher to populate the table:');
      console.log('      npm run test:x-sentiment');
    }

    console.log('\n✅ X Data Query Complete!');
    console.log('\n🔗 Access your data in BigQuery Console:');
    console.log(`   https://console.cloud.google.com/bigquery?project=${process.env.GOOGLE_CLOUD_PROJECT}`);
    console.log(`   Dataset: ${process.env.BIGQUERY_DATASET}`);
    console.log(`   Table: x_sentiment_data`);

  } catch (error) {
    console.error('❌ Error querying X data:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check your Google Cloud credentials');
    console.error('   2. Verify the BigQuery table exists');
    console.error('   3. Ensure you have proper permissions');
  }
}

// Run the query
if (require.main === module) {
  queryXData().catch(console.error);
}

module.exports = { queryXData }; 