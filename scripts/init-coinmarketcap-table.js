require('dotenv').config();
const { BigQuery } = require('@google-cloud/bigquery');

async function initializeCoinMarketCapTable() {
  console.log('Initializing CoinMarketCap Fear and Greed BigQuery table...');
  
  try {
    const bigquery = new BigQuery({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'dev-epsilon-467101-v2',
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    const datasetId = process.env.BIGQUERY_DATASET || 'direction_sky_data';
    const tableId = 'coinmarketcap_fear_greed';

    const dataset = bigquery.dataset(datasetId);
    const table = dataset.table(tableId);

    // Check if table exists
    const [exists] = await table.exists();
    if (exists) {
      console.log(`Table ${tableId} already exists`);
      return;
    }

    // Create table schema
    const schema = [
      { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'value', type: 'INT64', mode: 'REQUIRED' },
      { name: 'value_classification', type: 'STRING', mode: 'REQUIRED' },
      { name: 'time_until_update', type: 'INT64', mode: 'REQUIRED' },
      { name: 'metadata', type: 'JSON', mode: 'REQUIRED' },
      { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
    ];

    const options = {
      schema,
      timePartitioning: {
        type: 'DAY',
        field: 'timestamp'
      }
    };

    await table.create(options);
    console.log(`Table ${tableId} created successfully in dataset ${datasetId}`);
    
  } catch (error) {
    console.error('Error initializing BigQuery table:', error);
    throw error;
  }
}

// Run the initialization
initializeCoinMarketCapTable()
  .then(() => {
    console.log('✅ CoinMarketCap table initialization completed');
  })
  .catch((error) => {
    console.error('❌ CoinMarketCap table initialization failed:', error);
  }); 