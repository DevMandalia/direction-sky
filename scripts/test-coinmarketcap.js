const { coinmarketcapDataFetcher } = require('../dist/functions/coinmarketcapDataFetcher');

// Mock request and response objects
const mockRequest = {
  body: {},
  query: {},
  headers: {}
};

const mockResponse = {
  status: (code) => {
    console.log(`Response status: ${code}`);
    return mockResponse;
  },
  json: (data) => {
    console.log('Response data:', JSON.stringify(data, null, 2));
    return mockResponse;
  }
};

async function testCoinMarketCapDataFetcher() {
  console.log('Testing CoinMarketCap Fear and Greed data fetcher...');
  console.log('==================================================');
  
  try {
    await coinmarketcapDataFetcher(mockRequest, mockResponse);
    console.log('\n✅ CoinMarketCap data fetcher test completed successfully');
  } catch (error) {
    console.error('\n❌ CoinMarketCap data fetcher test failed:', error);
  }
}

// Run the test
testCoinMarketCapDataFetcher(); 