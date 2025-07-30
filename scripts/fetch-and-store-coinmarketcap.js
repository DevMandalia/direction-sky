require('dotenv').config();
const axios = require('axios');
const { BigQuery } = require('@google-cloud/bigquery');

async function fetchAndStoreCoinMarketCapData() {
  console.log('Fetching real-time CoinMarketCap data and storing in BigQuery...');
  
  try {
    // Fetch data from the deployed function
    console.log('📡 Fetching data from deployed function...');
    const functionUrl = 'https://us-central1-dev-epsilon-467101-v2.cloudfunctions.net/coinmarketcap-fetcher';
    
    const response = await axios.get(functionUrl);
    const data = response.data;
    
    console.log('✅ Data fetched successfully:');
    console.log(`  Sentiment: ${data.sentiment.value} (${data.sentiment.classification})`);
    console.log(`  Processing Time: ${data.processingTime}ms`);
    
    // Store in BigQuery
    console.log('\n💾 Storing data in BigQuery...');
    
    const bigquery = new BigQuery({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'dev-epsilon-467101-v2',
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    const datasetId = process.env.BIGQUERY_DATASET || 'direction_sky_data';
    const tableId = 'coinmarketcap_fear_greed';

    const rowData = {
      timestamp: new Date(data.sentiment.timestamp).toISOString(),
      value: data.sentiment.value,
      value_classification: data.sentiment.classification,
      time_until_update: 3600, // 1 hour
      metadata: JSON.stringify({
        source: 'coinmarketcap',
        stored_at: Date.now(),
        processing_time: data.processingTime,
        factors: data.sentiment.factors,
        market_data: data.market_data,
        api_credits_used: 2
      }),
      created_at: new Date().toISOString()
    };

    const dataset = bigquery.dataset(datasetId);
    const table = dataset.table(tableId);

    await table.insert([rowData]);
    console.log('✅ Data stored in BigQuery successfully');

    // Query recent data
    console.log('\n📊 Querying recent data from BigQuery...');
    const query = `
      SELECT 
        timestamp,
        value,
        value_classification,
        metadata,
        created_at
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT || 'dev-epsilon-467101-v2'}.${datasetId}.${tableId}\`
      ORDER BY timestamp DESC
      LIMIT 3
    `;

    const [rows] = await bigquery.query({ query });
    
    console.log('\n📈 Recent BigQuery Records:');
    console.log('===========================');
    
    rows.forEach((row, index) => {
      const metadata = JSON.parse(row.metadata);
      console.log(`\nRecord ${index + 1}:`);
      console.log(`  Timestamp: ${new Date(row.timestamp.value || row.timestamp).toLocaleString()}`);
      console.log(`  Sentiment: ${row.value} (${row.value_classification})`);
      console.log(`  BTC Price: $${metadata.market_data?.btc_price?.toLocaleString() || 'N/A'}`);
      console.log(`  BTC 24h Change: ${metadata.market_data?.btc_24h_change?.toFixed(2)}%`);
      console.log(`  Total Market Cap: $${(metadata.market_data?.total_market_cap / 1e12).toFixed(2)}T`);
      console.log(`  Processing Time: ${metadata.processing_time}ms`);
    });

    // Get table statistics
    const [tableMetadata] = await table.getMetadata();
    console.log(`\n📋 Table Statistics:`);
    console.log(`  Total Rows: ${tableMetadata.numRows || 0}`);
    console.log(`  Table Size: ${((tableMetadata.numBytes || 0) / 1024).toFixed(2)} KB`);
    console.log(`  Last Modified: ${new Date(tableMetadata.lastModifiedTime).toLocaleString()}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the script
fetchAndStoreCoinMarketCapData()
  .then(() => {
    console.log('\n🎉 CoinMarketCap data fetch and store completed successfully!');
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
  }); 