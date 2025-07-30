require('dotenv').config();
const { BigQuery } = require('@google-cloud/bigquery');

async function insertAndQueryCoinMarketCapData() {
  console.log('Inserting CoinMarketCap data and querying results...');
  
  try {
    const bigquery = new BigQuery({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'dev-epsilon-467101-v2',
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    const datasetId = process.env.BIGQUERY_DATASET || 'direction_sky_data';
    const tableId = 'coinmarketcap_fear_greed';

    // Insert test data
    const testData = {
      timestamp: new Date().toISOString(),
      value: 62,
      value_classification: 'Greed',
      time_until_update: 3600,
      metadata: JSON.stringify({
        source: 'coinmarketcap',
        stored_at: Date.now(),
        api_credits_used: 2,
        factors: {
          price_momentum: -1.82,
          volume_ratio: 0.397,
          btc_dominance: 60.86,
          market_cap_change: -1.66
        }
      }),
      created_at: new Date().toISOString()
    };

    const dataset = bigquery.dataset(datasetId);
    const table = dataset.table(tableId);

    // Insert the data
    await table.insert([testData]);
    console.log('✅ Test data inserted successfully');

    // Query the data
    const query = `
      SELECT 
        timestamp,
        value,
        value_classification,
        metadata,
        created_at
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT || 'dev-epsilon-467101-v2'}.${datasetId}.${tableId}\`
      ORDER BY timestamp DESC
      LIMIT 5
    `;

    const [rows] = await bigquery.query({ query });
    
    console.log('\n📊 BigQuery Data Results:');
    console.log('========================');
    
    if (rows.length === 0) {
      console.log('No data found in the table');
    } else {
      rows.forEach((row, index) => {
        console.log(`\nRecord ${index + 1}:`);
        console.log(`  Timestamp: ${row.timestamp}`);
        console.log(`  Sentiment Value: ${row.value}`);
        console.log(`  Classification: ${row.value_classification}`);
        console.log(`  Created At: ${row.created_at}`);
        
        if (row.metadata) {
          const metadata = JSON.parse(row.metadata);
          console.log(`  Factors:`);
          console.log(`    - Price Momentum: ${metadata.factors?.price_momentum || 'N/A'}`);
          console.log(`    - Volume Ratio: ${metadata.factors?.volume_ratio || 'N/A'}`);
          console.log(`    - BTC Dominance: ${metadata.factors?.btc_dominance || 'N/A'}`);
          console.log(`    - Market Cap Change: ${metadata.factors?.market_cap_change || 'N/A'}`);
        }
      });
    }

    // Get table info
    const [metadata] = await table.getMetadata();
    console.log(`\n📋 Table Information:`);
    console.log(`  Table ID: ${metadata.id}`);
    console.log(`  Created: ${metadata.creationTime}`);
    console.log(`  Last Modified: ${metadata.lastModifiedTime}`);
    console.log(`  Row Count: ${metadata.numRows || 0}`);
    console.log(`  Size: ${metadata.numBytes || 0} bytes`);

  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Run the script
insertAndQueryCoinMarketCapData()
  .then(() => {
    console.log('\n✅ CoinMarketCap data insertion and query completed');
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
  }); 