#!/usr/bin/env node

/**
 * X Data Fetcher Runner
 * This script actually calls the X data fetcher function to populate BigQuery
 */

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

async function runXDataFetcher() {
  log('🚀 Starting X Data Fetcher...', 'blue');
  log('=====================================', 'blue');
  
  try {
    // Import the X data fetcher function
    const { xDataFetcher } = require('../dist/functions/xDataFetcher');
    
    // Create mock request and response objects
    const mockReq = {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: {
        source: 'manual_trigger',
        timestamp: Date.now()
      }
    };

    const mockRes = {
      status: (code) => {
        log(`📡 Response Status: ${code}`, code >= 400 ? 'red' : 'green');
        return mockRes;
      },
      json: (data) => {
        log('\n📊 X Data Fetcher Results:', 'cyan');
        log('========================', 'cyan');
        
        if (data.success) {
          logSuccess('✅ X Data Fetcher completed successfully!');
          log(`📅 Timestamp: ${new Date(data.timestamp).toLocaleString()}`);
          log(`🆔 Ingestion ID: ${data.ingestionId}`);
          log(`📝 Note: ${data.note}`);
          
          if (data.results && data.results.length > 0) {
            log('\n📈 Data Collection Summary:', 'blue');
            data.results.forEach((result, index) => {
              log(`   ${index + 1}. Source: ${result.source}`);
              log(`      Status: ${result.status}`);
              if (result.data) {
                log(`      Data Points: ${result.data.total_tweets || 'N/A'}`);
              }
            });
          }
          
          if (data.xSentimentMetrics) {
            log('\n🎯 X Sentiment Metrics Available:', 'blue');
            data.xSentimentMetrics.forEach((metric, index) => {
              log(`   ${index + 1}. ${metric}`);
            });
          }
          
          log('\n💾 Data Storage:', 'blue');
          log('   ✅ Sentiment data stored in BigQuery');
          log('   ✅ Latest metrics cached in Redis (if available)');
          log('   ✅ Table: direction_sky_data.x_sentiment_data');
          
        } else {
          logError('❌ X Data Fetcher failed!');
          if (data.error) {
            logError(`   Error: ${data.error}`);
          }
        }
        
        return mockRes;
      },
      send: (data) => {
        log('\n📤 Raw Response:', 'yellow');
        console.log(JSON.stringify(data, null, 2));
        return mockRes;
      }
    };

    // Run the X data fetcher
    log('🔄 Executing X Data Fetcher...', 'yellow');
    await xDataFetcher(mockReq, mockRes);
    
    log('\n✅ X Data Fetcher execution completed!', 'green');
    log('\n🔍 Next Steps:', 'blue');
    log('   1. Run "npm run query:x-data" to view stored data');
    log('   2. Check BigQuery Console for detailed data');
    log('   3. Set up automated scheduling for regular data collection');
    
  } catch (error) {
    logError('\n❌ Error running X Data Fetcher:');
    logError(error.message);
    logError('\n🔧 Troubleshooting:');
    logError('   1. Check your Google Cloud credentials');
    logError('   2. Verify BigQuery permissions');
    logError('   3. Ensure X API credentials are configured');
    logError('   4. Check network connectivity');
    
    console.error('\nFull error details:', error);
  }
}

// Configuration check
function checkConfiguration() {
  log('\n🔧 Configuration Check:', 'blue');
  log('====================', 'blue');
  
  const requiredEnvVars = [
    'GOOGLE_CLOUD_PROJECT',
    'BIGQUERY_DATASET',
    'GOOGLE_APPLICATION_CREDENTIALS'
  ];
  
  const optionalEnvVars = [
    'X_API_KEY',
    'X_API_SECRET', 
    'X_BEARER_TOKEN'
  ];
  
  let allRequired = true;
  
  requiredEnvVars.forEach(varName => {
    if (process.env[varName]) {
      logSuccess(`   ✅ ${varName}: Configured`);
    } else {
      logError(`   ❌ ${varName}: Missing`);
      allRequired = false;
    }
  });
  
  log('\n📡 X API Configuration:', 'blue');
  optionalEnvVars.forEach(varName => {
    if (process.env[varName] && process.env[varName] !== 'your_twitter_api_key_here') {
      logSuccess(`   ✅ ${varName}: Configured (Real API)`);
    } else {
      logWarning(`   ⚠️  ${varName}: Not configured (Using mock data)`);
    }
  });
  
  if (!allRequired) {
    logError('\n❌ Missing required configuration. Please check your .env file.');
    process.exit(1);
  }
  
  log('\n✅ Configuration check passed!', 'green');
}

// Main execution
async function main() {
  log('🐦 X Data Fetcher Runner', 'cyan');
  log('======================', 'cyan');
  
  // Check configuration first
  checkConfiguration();
  
  // Run the data fetcher
  await runXDataFetcher();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runXDataFetcher, checkConfiguration }; 