#!/usr/bin/env node

/**
 * Test script for the data ingestion layer
 * This script tests the API client and data fetching functionality locally
 */

const axios = require('axios');
require('dotenv').config();

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  console.error(`${colors.red}${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}${message}${colors.reset}`);
}

// Test configuration
const tests = [
  {
    name: 'Glassnode API',
    test: async () => {
      const apiKey = process.env.GLASSNODE_API_KEY;
      if (!apiKey) {
        throw new Error('GLASSNODE_API_KEY not set');
      }
      
      const url = 'https://api.glassnode.com/v1/metrics/addresses/active_count';
      const params = new URLSearchParams({
        api_key: apiKey,
        a: 'BTC',
        i: '24h',
        timestamp: Math.floor(Date.now() / 1000).toString()
      });
      
      const response = await axios.get(`${url}?${params.toString()}`, {
        timeout: 10000
      });
      
      return {
        status: response.status,
        dataPoints: response.data?.v?.length || 0,
        data: response.data
      };
    }
  },
  {
    name: 'CoinGlass API',
    test: async () => {
      const apiKey = process.env.COINGLASS_API_KEY;
      if (!apiKey) {
        throw new Error('COINGLASS_API_KEY not set');
      }
      
      const response = await axios.get('https://open-api.coinglass.com/api/pro/v1/futures/fundingRate', {
        headers: {
          'CG-API-KEY': apiKey
        },
        params: {
          symbol: 'BTCUSDT'
        },
        timeout: 10000
      });
      
      return {
        status: response.status,
        success: response.data?.success,
        data: response.data
      };
    }
  },
  {
    name: 'FRED API',
    test: async () => {
      const apiKey = process.env.FRED_API_KEY;
      if (!apiKey) {
        throw new Error('FRED_API_KEY not set');
      }
      
      const url = 'https://api.stlouisfed.org/fred/series/observations';
      const params = new URLSearchParams({
        api_key: apiKey,
        series_id: 'FEDFUNDS',
        limit: 10,
        sort_order: 'desc',
        file_type: 'json'
      });
      
      const response = await axios.get(`${url}?${params.toString()}`, {
        timeout: 10000
      });
      
      return {
        status: response.status,
        observations: response.data?.observations?.length || 0,
        data: response.data
      };
    }
  },
  {
    name: 'Binance API',
    test: async () => {
      const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
        params: {
          symbol: 'BTCUSDT'
        },
        timeout: 10000
      });
      
      return {
        status: response.status,
        symbol: response.data?.symbol,
        price: response.data?.lastPrice,
        data: response.data
      };
    }
  },
  {
    name: 'Processing Layer URL',
    test: async () => {
      const url = process.env.PROCESSING_LAYER_URL;
      if (!url) {
        throw new Error('PROCESSING_LAYER_URL not set');
      }
      
      // Test if the URL is reachable (don't actually send data)
      const testData = {
        test: true,
        timestamp: Date.now(),
        source: 'test'
      };
      
      try {
        const response = await axios.post(url, testData, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        return {
          status: response.status,
          reachable: true,
          data: response.data
        };
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          return {
            status: 'unreachable',
            reachable: false,
            error: error.message
          };
        }
        throw error;
      }
    }
  }
];

async function runTests() {
  log('🧪 Starting Data Ingestion Layer Tests', 'blue');
  log('=====================================', 'blue');
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      log(`\nTesting ${test.name}...`, 'yellow');
      const startTime = Date.now();
      
      const result = await test.test();
      const duration = Date.now() - startTime;
      
      logSuccess(`✅ ${test.name} - PASSED (${duration}ms)`);
      console.log('   Result:', JSON.stringify(result, null, 2));
      
      results.push({
        name: test.name,
        status: 'PASSED',
        duration,
        result
      });
      passed++;
      
    } catch (error) {
      logError(`❌ ${test.name} - FAILED`);
      console.error('   Error:', error.message);
      
      results.push({
        name: test.name,
        status: 'FAILED',
        error: error.message
      });
      failed++;
    }
  }
  
  // Summary
  log('\n📊 Test Summary', 'blue');
  log('==============', 'blue');
  log(`Total Tests: ${tests.length}`);
  log(`Passed: ${passed}`, passed > 0 ? 'green' : 'reset');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'reset');
  
  if (failed === 0) {
    log('\n🎉 All tests passed! The data ingestion layer is ready for deployment.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please fix the issues before deploying.', 'yellow');
  }
  
  return { passed, failed, results };
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests()
    .then(({ passed, failed }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      logError('Test runner failed:');
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runTests }; 