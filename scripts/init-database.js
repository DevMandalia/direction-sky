const { BigQuery } = require('@google-cloud/bigquery');

async function initializeDatabase() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const datasetId = process.env.BIGQUERY_DATASET || 'direction_sky_data';
  const tableId = process.env.BIGQUERY_TABLE || 'fred_metrics';

  if (!projectId) {
    console.error('GOOGLE_CLOUD_PROJECT environment variable is required');
    process.exit(1);
  }

  const bigquery = new BigQuery({
    projectId,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
  });

  try {
    // Create dataset if it doesn't exist
    const dataset = bigquery.dataset(datasetId);
    const [exists] = await dataset.exists();
    
    if (!exists) {
      await dataset.create();
      console.log(`Dataset ${datasetId} created successfully`);
    } else {
      console.log(`Dataset ${datasetId} already exists`);
    }

    // Create table if it doesn't exist
    const table = dataset.table(tableId);
    const [tableExists] = await table.exists();
    
    if (!tableExists) {
      const schema = [
        { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
        { name: 'metric', type: 'STRING', mode: 'REQUIRED' },
        { name: 'source', type: 'STRING', mode: 'REQUIRED' },
        { name: 'value', type: 'FLOAT64', mode: 'REQUIRED' },
        { name: 'date', type: 'DATE', mode: 'REQUIRED' },
        { name: 'metadata', type: 'JSON', mode: 'NULLABLE' },
        { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
      ];

      const options = {
        schema,
        timePartitioning: {
          type: 'DAY',
          field: 'date'
        },
        clustering: ['metric', 'source']
      };

      await table.create(options);
      console.log(`Table ${tableId} created successfully`);
    } else {
      console.log(`Table ${tableId} already exists`);
    }

    console.log('Database initialization completed successfully!');
    
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();