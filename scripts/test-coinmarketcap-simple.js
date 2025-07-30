require('dotenv').config();
const { APIClient } = require('../dist/utils/apiClient');

async function testCoinMarketCapAPI() {
  console.log('Testing CoinMarketCap Fear and Greed API...');
  console.log('===========================================');
  
  // Check if API key is set
  if (!process.env.COINMARKETCAP_API_KEY) {
    console.error('❌ COINMARKETCAP_API_KEY environment variable is not set');
    console.log('Please add your CoinMarketCap API key to your .env file');
    return;
  }
  
  try {
    const apiClient = new APIClient();
    
    console.log('📡 Fetching Fear and Greed Index data...');
    console.log('🔑 API Key:', process.env.COINMARKETCAP_API_KEY ? 'Set (hidden)' : 'Not set');
    
    // Test the API endpoint directly first
    console.log('🌐 Testing API endpoint...');
    const axios = require('axios');
    
    // Try different possible endpoints
    const endpoints = [
      'https://pro-api.coinmarketcap.com/v1/tools/fear-greed-index',
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC',
      'https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest',
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/market-pairs/latest?symbol=BTC',
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/ohlcv/latest?symbol=BTC',
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/trending/latest',
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/sentiment/latest?symbol=BTC'
    ];
    
    const workingEndpoints = [];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Testing endpoint: ${endpoint}`);
        const testResponse = await axios.get(endpoint, {
          headers: {
            'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY
          }
        });
        console.log('✅ Endpoint works!');
        console.log('📊 Response status:', testResponse.status);
        console.log('📊 Response data keys:', Object.keys(testResponse.data));
        
        workingEndpoints.push({
          endpoint,
          status: testResponse.status,
          dataKeys: Object.keys(testResponse.data)
        });
        
        // Show sample data for global metrics and sentiment-related endpoints
        if (endpoint.includes('global-metrics') || endpoint.includes('sentiment') || endpoint.includes('trending')) {
          console.log('📊 Sample data structure:');
          console.log(JSON.stringify(testResponse.data, null, 2));
        }
        
      } catch (error) {
        console.log(`❌ Endpoint failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      }
    }
    
    console.log('\n📋 Working endpoints:');
    workingEndpoints.forEach(ep => {
      console.log(`  ✅ ${ep.endpoint} (${ep.status})`);
    });
    
    console.log('\n🧠 Testing custom sentiment calculation...');
    const data = await apiClient.fetchCoinMarketCapFearGreedData();
    
    console.log('✅ API call successful!');
    console.log('\n📊 Fear and Greed Index Data:');
    console.log(`   Value: ${data.data.value}`);
    console.log(`   Classification: ${data.data.value_classification}`);
    console.log(`   Timestamp: ${data.data.timestamp}`);
    console.log(`   Time until update: ${data.data.time_until_update} seconds`);
    console.log(`   API Credits Used: ${data.status.credit_count}`);
    console.log(`   Response Time: ${data.status.elapsed}ms`);
    
    // Determine sentiment
    const value = data.data.value;
    let sentiment = '';
    if (value <= 25) sentiment = '😱 Extreme Fear';
    else if (value <= 45) sentiment = '😨 Fear';
    else if (value <= 55) sentiment = '😐 Neutral';
    else if (value <= 75) sentiment = '😏 Greed';
    else sentiment = '🤪 Extreme Greed';
    
    console.log(`\n🎭 Market Sentiment: ${sentiment}`);
    
  } catch (error) {
    console.error('❌ API call failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testCoinMarketCapAPI(); 