#!/usr/bin/env node

require('dotenv').config();

async function testFREDSimple() {
  console.log('🧪 Testing FRED Function (Simple Version)...');
  
  // Check if FRED API key is available
  const fredApiKey = process.env.FRED_API_KEY;
  if (!fredApiKey || fredApiKey === 'your_fred_api_key_here') {
    console.error('❌ FRED_API_KEY not set or still using placeholder value');
    console.log('Please get your FRED API key from: https://fred.stlouisfed.org/docs/api/api_key.html');
    console.log('Then update your .env.local file with the actual API key');
    return;
  }
  
  console.log('✅ FRED API key found');
  
  try {
    // Test a simple FRED API call
    const axios = require('axios');
    
    console.log('\n📊 Testing FRED API call...');
    const url = 'https://api.stlouisfed.org/fred/series/observations';
    const params = new URLSearchParams({
      api_key: fredApiKey,
      series_id: 'FEDFUNDS', // Federal Funds Rate
      limit: 5,
      sort_order: 'desc',
      file_type: 'json'
    });
    
    const response = await axios.get(`${url}?${params.toString()}`, {
      timeout: 15000
    });
    
    const observations = response.data?.observations || [];
    console.log(`✅ FRED API call successful`);
    console.log(`   Retrieved ${observations.length} observations`);
    
    if (observations.length > 0) {
      console.log(`   Latest value: ${observations[0].value} (${observations[0].date})`);
    }
    
    console.log('\n🎉 FRED API is working correctly!');
    console.log('\nNext steps:');
    console.log('1. Set up Google Cloud credentials in .env.local');
    console.log('2. Run: npm run test:database');
    console.log('3. Deploy and test the full function: npm run deploy:functions && npm run invoke:fred');
    
  } catch (error) {
    console.error('❌ FRED API test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testFREDSimple(); 