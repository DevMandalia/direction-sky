#!/usr/bin/env node

require('dotenv').config();

async function testDatabaseStorage() {
  console.log('🧪 Testing Database Storage...');
  
  // Check environment variables first
  console.log('1. Checking environment variables...');
  const requiredEnvVars = ['GOOGLE_CLOUD_PROJECT', 'GOOGLE_APPLICATION_CREDENTIALS'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.error('Please set these in your .env.local file');
    return;
  }
  
  console.log('✅ Environment variables found');
  console.log(`   Project ID: ${process.env.GOOGLE_CLOUD_PROJECT}`);
  console.log(`   Credentials: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
  
  try {
    // Test 2: Check if BigQuery package is available
    console.log('\n2. Checking BigQuery package...');
    const { BigQuery } = require('@google-cloud/bigquery');
    console.log('✅ BigQuery package available');
    
    // Test 3: Initialize BigQuery client
    console.log('\n3. Testing BigQuery client initialization...');
    const bigquery = new BigQuery({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    console.log('✅ BigQuery client initialized');
    
    // Test 4: Test dataset access
    console.log('\n4. Testing dataset access...');
    const datasetId = process.env.BIGQUERY_DATASET || 'direction_sky_data';
    const tableId = process.env.BIGQUERY_TABLE || 'fred_metrics';
    
    const dataset = bigquery.dataset(datasetId);
    const [datasetExists] = await dataset.exists();
    
    if (!datasetExists) {
      console.log(`Creating dataset ${datasetId}...`);
      await dataset.create();
      console.log('✅ Dataset created');
    } else {
      console.log('✅ Dataset exists');
    }
    
    // Test 5: Test table creation
    console.log('\n5. Testing table creation...');
    const table = dataset.table(tableId);
    const [tableExists] = await table.exists();
    
    if (!tableExists) {
      console.log(`Creating table ${tableId}...`);
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
        }
      };

      await table.create(options);
      console.log('✅ Table created');
    } else {
      console.log('✅ Table exists');
    }
    
    // Test 6: Test data insertion
    console.log('\n6. Testing data insertion...');
    const sampleRows = [
      {
        timestamp: new Date('2024-01-01').toISOString(),
        metric: 'test_metric',
        source: 'fred',
        value: 5.25,
        date: '2024-01-01',
        metadata: JSON.stringify({
          series_id: 'TEST',
          description: 'Test Metric',
          unit: 'percent',
          category: 'test'
        }),
        created_at: new Date().toISOString()
      }
    ];
    
    await table.insert(sampleRows);
    console.log('✅ Data inserted successfully');
    
    // Test 7: Test data retrieval
    console.log('\n7. Testing data retrieval...');
    const query = `
      SELECT 
        timestamp,
        value,
        metric,
        source,
        date
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${datasetId}.${tableId}\`
      WHERE metric = @metric 
        AND source = 'fred'
      ORDER BY timestamp DESC
      LIMIT 5
    `;
    
    const [rows] = await bigquery.query({
      query,
      params: { metric: 'test_metric' }
    });
    
    console.log(`✅ Retrieved ${rows.length} rows`);
    if (rows.length > 0) {
      console.log(`   Latest value: ${rows[0].value} (${rows[0].date})`);
    }
    
    console.log('\n🎉 All database tests passed!');
    console.log('\nYour BigQuery setup is working correctly.');
    console.log('FRED data will now be stored in the database for historical analysis.');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure GOOGLE_CLOUD_PROJECT is set correctly');
    console.error('2. Make sure GOOGLE_APPLICATION_CREDENTIALS points to a valid service account key file');
    console.error('3. Enable BigQuery API: gcloud services enable bigquery.googleapis.com');
    console.error('4. Create a service account with BigQuery permissions');
    console.error('5. Make sure the service account key file exists and is readable');
    console.error('\nFull error:', error);
  }
}

testDatabaseStorage(); 