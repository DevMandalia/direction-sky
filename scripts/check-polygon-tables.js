#!/usr/bin/env node

/**
 * Script to check existing polygon tables in BigQuery
 */

const { BigQuery } = require('@google-cloud/bigquery');

async function checkPolygonTables() {
  console.log('🔍 Checking existing Polygon tables in BigQuery...\n');

  try {
    // Initialize BigQuery client
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'dev-epsilon-467101-v2';
    const datasetId = process.env.BIGQUERY_DATASET || 'direction_sky_data';
    
    const bigquery = new BigQuery({
      projectId: projectId,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    const dataset = bigquery.dataset(datasetId);

    // List all tables in the dataset
    console.log('📊 Tables in dataset:');
    const [tables] = await dataset.getTables();
    
    const polygonTables = tables.filter(table => 
      table.id.includes('polygon') || table.id.includes('backup')
    );

    if (polygonTables.length === 0) {
      console.log('❌ No polygon tables found');
      return;
    }

    for (const table of polygonTables) {
      console.log(`\n🔹 Table: ${table.id}`);
      
      try {
        const [metadata] = await table.getMetadata();
        console.log(`  Creation time: ${new Date(parseInt(metadata.creationTime)).toISOString()}`);
        console.log(`  Last modified: ${new Date(parseInt(metadata.lastModifiedTime)).toISOString()}`);
        console.log(`  Number of rows: ${metadata.numRows || 'Unknown'}`);
        console.log(`  Clustering: ${metadata.clustering?.fields?.join(', ') || 'None'}`);
        console.log(`  Partitioning: ${metadata.timePartitioning?.type || 'None'}`);
        
        if (metadata.timePartitioning?.field) {
          console.log(`  Partition field: ${metadata.timePartitioning.field}`);
        }
      } catch (error) {
        console.log(`  Error getting metadata: ${error.message}`);
      }
    }

    // Check for specific tables
    const specificTables = [
      'polygon_options',
      'polygon_options_new', 
      'polygon_stocks',
      'polygon_crypto',
      'polygon_realtime'
    ];

    console.log('\n🎯 Specific table status:');
    for (const tableName of specificTables) {
      const table = dataset.table(tableName);
      const [exists] = await table.exists();
      console.log(`  ${tableName}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    }

  } catch (error) {
    console.error('\n❌ Error checking tables:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the check
if (require.main === module) {
  checkPolygonTables();
}

module.exports = { checkPolygonTables }; 