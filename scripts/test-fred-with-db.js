#!/usr/bin/env node

require('dotenv').config();

async function testFREDWithDatabase() {
  console.log('🧪 Testing FRED Function with Database Storage...');
  
  try {
    // Import the FRED function directly
    const { fredDataFetcher } = require('../dist/functions/fredDataFetcher');
    
    console.log('📊 Calling FRED function...');
    const result = await fredDataFetcher();
    
    console.log('✅ FRED function completed successfully!');
    console.log('📈 Results:', JSON.stringify(result, null, 2));
    
    // Check if data was stored in BigQuery
    console.log('\n🔍 Checking BigQuery for stored data...');
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    try {
      const { stdout } = await execAsync('bq query --use_legacy_sql=false "SELECT COUNT(*) as total_rows, COUNT(DISTINCT metric) as unique_metrics FROM \`dev-epsilon-467101-v2.direction_sky_data.fred_metrics\` WHERE source = \'fred\'"');
      console.log('📊 BigQuery Results:');
      console.log(stdout);
      
      // Get sample of stored data
      const { stdout: sampleData } = await execAsync('bq query --use_legacy_sql=false "SELECT metric, value, date, created_at FROM \`dev-epsilon-467101-v2.direction_sky_data.fred_metrics\` WHERE source = \'fred\' ORDER BY created_at DESC LIMIT 5"');
      console.log('\n📋 Sample Stored Data:');
      console.log(sampleData);
      
    } catch (error) {
      console.error('❌ Error querying BigQuery:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing FRED function:', error);
  }
}

testFREDWithDatabase(); 