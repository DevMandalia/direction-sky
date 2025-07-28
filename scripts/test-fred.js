#!/usr/bin/env node

/**
 * FRED API Test Script
 * This script tests the FRED API with all available economic indicators
 */

const axios = require('axios');
require('dotenv').config();

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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

function logInfo(message) {
  console.log(`${colors.blue}${message}${colors.reset}`);
}

function logCategory(message) {
  console.log(`${colors.cyan}${message}${colors.reset}`);
}

// FRED API test configuration
const FRED_TESTS = [
  // Interest Rates
  {
    name: 'Federal Funds Rate',
    category: 'Interest Rates',
    series_id: 'FEDFUNDS',
    description: 'Federal Funds Rate'
  },
  {
    name: 'Prime Rate',
    category: 'Interest Rates',
    series_id: 'DPRIME',
    description: 'Bank Prime Loan Rate'
  },
  {
    name: '10-Year Treasury',
    category: 'Interest Rates',
    series_id: 'DGS10',
    description: '10-Year Treasury Constant Maturity Rate'
  },
  {
    name: '2-Year Treasury',
    category: 'Interest Rates',
    series_id: 'DGS2',
    description: '2-Year Treasury Constant Maturity Rate'
  },

  // Employment
  {
    name: 'Unemployment Rate',
    category: 'Employment',
    series_id: 'UNRATE',
    description: 'Unemployment Rate'
  },
  {
    name: 'Nonfarm Payrolls',
    category: 'Employment',
    series_id: 'PAYEMS',
    description: 'Total Nonfarm Payrolls'
  },
  {
    name: 'Labor Force Participation',
    category: 'Employment',
    series_id: 'CIVPART',
    description: 'Labor Force Participation Rate'
  },

  // GDP
  {
    name: 'GDP',
    category: 'GDP',
    series_id: 'GDP',
    description: 'Gross Domestic Product'
  },
  {
    name: 'GDP Growth',
    category: 'GDP',
    series_id: 'A191RL1Q225SBEA',
    description: 'Real GDP Growth Rate'
  },

  // Inflation
  {
    name: 'CPI All Items',
    category: 'Inflation',
    series_id: 'CPIAUCSL',
    description: 'Consumer Price Index for All Urban Consumers'
  },
  {
    name: 'CPI Core',
    category: 'Inflation',
    series_id: 'CPILFESL',
    description: 'Consumer Price Index: All Items Less Food and Energy'
  },
  {
    name: 'PCE Inflation',
    category: 'Inflation',
    series_id: 'PCEPI',
    description: 'Personal Consumption Expenditures: Chain-type Price Index'
  },

  // Money Supply
  {
    name: 'M1 Money Supply',
    category: 'Money Supply',
    series_id: 'M1SL',
    description: 'M1 Money Stock'
  },
  {
    name: 'M2 Money Supply',
    category: 'Money Supply',
    series_id: 'M2SL',
    description: 'M2 Money Stock'
  },

  // Housing
  {
    name: 'Housing Starts',
    category: 'Housing',
    series_id: 'HOUST',
    description: 'Housing Starts: Total'
  },

  // Consumer
  {
    name: 'Personal Consumption',
    category: 'Consumer',
    series_id: 'PCE',
    description: 'Personal Consumption Expenditures'
  },
  {
    name: 'Retail Sales',
    category: 'Consumer',
    series_id: 'RSAFS',
    description: 'Advance Retail Sales: Retail and Food Services'
  },

  // Manufacturing
  {
    name: 'Industrial Production',
    category: 'Manufacturing',
    series_id: 'INDPRO',
    description: 'Industrial Production: Total Index'
  },
  {
    name: 'Capacity Utilization',
    category: 'Manufacturing',
    series_id: 'TCUM',
    description: 'Capacity Utilization: Manufacturing'
  },

  // Trade
  {
    name: 'Trade Balance',
    category: 'Trade',
    series_id: 'BOPGSTB',
    description: 'Trade Balance: Goods and Services'
  },
  {
    name: 'Exports',
    category: 'Trade',
    series_id: 'EXPGS',
    description: 'Exports of Goods and Services'
  },
  {
    name: 'Imports',
    category: 'Trade',
    series_id: 'IMPGS',
    description: 'Imports of Goods and Services'
  },

  // Markets
  {
    name: 'Dow Jones',
    category: 'Markets',
    series_id: 'DJIA',
    description: 'Dow Jones Industrial Average'
  },
  {
    name: 'S&P 500',
    category: 'Markets',
    series_id: 'SP500',
    description: 'S&P 500'
  },
  {
    name: 'VIX',
    category: 'Markets',
    series_id: 'VIXCLS',
    description: 'CBOE Volatility Index: VIX'
  },

  // Currency
  {
    name: 'Dollar Index',
    category: 'Currency',
    series_id: 'DTWEXBGS',
    description: 'Trade Weighted U.S. Dollar Index: Broad'
  },
  {
    name: 'Euro/USD',
    category: 'Currency',
    series_id: 'DEXUSEU',
    description: 'U.S. Dollars to Euro Spot Exchange Rate'
  }
];

async function testFREDAPI() {
  log('🧪 Starting Comprehensive FRED API Test', 'blue');
  log('========================================', 'blue');
  
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey || apiKey === 'your_fred_api_key_here') {
    logError('❌ FRED_API_KEY not set or still using placeholder value');
    logInfo('Please get your FRED API key from: https://fred.stlouisfed.org/docs/api/api_key.html');
    logInfo('Then update your .env file with the actual API key');
    return { passed: 0, failed: 1, results: [] };
  }

  const results = [];
  let passed = 0;
  let failed = 0;
  let currentCategory = '';

  // Group tests by category
  const testsByCategory = FRED_TESTS.reduce((acc, test) => {
    if (!acc[test.category]) {
      acc[test.category] = [];
    }
    acc[test.category].push(test);
    return acc;
  }, {});

  for (const [category, tests] of Object.entries(testsByCategory)) {
    logCategory(`\n📊 Testing ${category} (${tests.length} metrics):`);
    
    for (const test of tests) {
      try {
        log(`  Testing ${test.name}...`, 'yellow');
        
        const url = 'https://api.stlouisfed.org/fred/series/observations';
        const params = new URLSearchParams({
          api_key: apiKey,
          series_id: test.series_id,
          limit: 10,
          sort_order: 'desc',
          file_type: 'json'
        });
        
        const startTime = Date.now();
        const response = await axios.get(`${url}?${params.toString()}`, {
          timeout: 15000
        });
        
        const duration = Date.now() - startTime;
        const observations = response.data?.observations || [];
        const latestValue = observations[0]?.value;
        const latestDate = observations[0]?.date;
        
        logSuccess(`    ✅ ${test.name} - PASSED (${duration}ms)`);
        console.log(`       Latest: ${latestValue} (${latestDate})`);
        console.log(`       Observations: ${observations.length}`);
        
        results.push({
          name: test.name,
          category: test.category,
          status: 'PASSED',
          duration,
          latestValue,
          latestDate,
          observationCount: observations.length,
          series_id: test.series_id
        });
        passed++;
        
      } catch (error) {
        logError(`    ❌ ${test.name} - FAILED`);
        console.error(`       Error: ${error.message}`);
        
        results.push({
          name: test.name,
          category: test.category,
          status: 'FAILED',
          error: error.message,
          series_id: test.series_id
        });
        failed++;
      }
    }
  }
  
  // Summary
  log('\n📈 Test Summary', 'blue');
  log('==============', 'blue');
  log(`Total Tests: ${FRED_TESTS.length}`);
  log(`Passed: ${passed}`, passed > 0 ? 'green' : 'reset');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'reset');
  
  // Category breakdown
  log('\n📊 Results by Category:', 'blue');
  const categoryResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = { passed: 0, failed: 0 };
    }
    if (result.status === 'PASSED') {
      acc[result.category].passed++;
    } else {
      acc[result.category].failed++;
    }
    return acc;
  }, {});
  
  for (const [category, stats] of Object.entries(categoryResults)) {
    const total = stats.passed + stats.failed;
    const successRate = ((stats.passed / total) * 100).toFixed(1);
    log(`${category}: ${stats.passed}/${total} (${successRate}%)`, stats.passed === total ? 'green' : 'yellow');
  }
  
  if (failed === 0) {
    log('\n🎉 All FRED API tests passed! Ready for deployment.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the errors above.', 'yellow');
  }
  
  return { passed, failed, results };
}

// Run tests if this script is executed directly
if (require.main === module) {
  testFREDAPI()
    .then(({ passed, failed }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      logError('Test runner failed:');
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testFREDAPI }; 