#!/usr/bin/env node

/**
 * MSTR-Only Polygon Options Fetcher
 * 
 * This is the actual production fetcher that only fetches MSTR options data
 * and stores it in BigQuery. It's designed to be deployed as a Cloud Function.
 */

require('dotenv').config();
const axios = require('axios');
const { BigQuery } = require('@google-cloud/bigquery');

// Configuration
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'dev-epsilon-467101-v2';
const BIGQUERY_DATASET = process.env.BIGQUERY_DATASET || 'direction_sky_data';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, 'bright');
  log(`  ${message}`, 'bright');
  log(`${'='.repeat(60)}`, 'bright');
}

// Main MSTR options fetcher function
async function fetchMSTROptions() {
  logHeader('MSTR Options Data Fetcher');
  
  const startTime = Date.now();
  
  try {
    // Check configuration
    if (!POLYGON_API_KEY) {
      throw new Error('POLYGON_API_KEY environment variable not set');
    }
    
    if (!GOOGLE_CLOUD_PROJECT) {
      throw new Error('GOOGLE_CLOUD_PROJECT environment variable not set');
    }
    
    logInfo('Configuration validated');
    logInfo(`Processing MSTR options only`);
    
    // Fetch ALL MSTR options chain with pagination
    logInfo('Fetching MSTR options chain (with pagination)...');
    
    let allOptionsData = [];
    let nextUrl = `https://api.polygon.io/v3/snapshot/options/MSTR?apiKey=${POLYGON_API_KEY}&limit=50`; // Use limit=50 per page
    let pageCount = 0;
    
    while (nextUrl) {
      pageCount++;
      logInfo(`Fetching page ${pageCount}...`);
      
      const optionsResponse = await axios.get(nextUrl);
      
      if (optionsResponse.status === 200 && optionsResponse.data.status === 'OK') {
        const pageData = optionsResponse.data.results;
        
        if (pageData && Array.isArray(pageData)) {
          allOptionsData = allOptionsData.concat(pageData);
          logInfo(`Page ${pageCount}: Got ${pageData.length} options (Total so far: ${allOptionsData.length})`);
          
          // Check if there's a next page and construct the proper URL
          if (optionsResponse.data.next_url) {
            // Extract cursor from next_url and construct new URL with API key
            const nextUrlObj = new URL(optionsResponse.data.next_url);
            const cursor = nextUrlObj.searchParams.get('cursor');
            if (cursor) {
              nextUrl = `https://api.polygon.io/v3/snapshot/options/MSTR?apiKey=${POLYGON_API_KEY}&limit=50&cursor=${cursor}`;
              logInfo('Waiting 1 second before next page...');
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              nextUrl = null;
            }
          } else {
            nextUrl = null;
          }
        } else {
          throw new Error('Invalid options data structure received from API');
        }
      } else {
        throw new Error(`API returned status: ${optionsResponse.data.status}`);
      }
    }
    
    logSuccess(`Completed pagination: ${pageCount} pages, ${allOptionsData.length} total options`);
    
    if (allOptionsData.length > 0) {
      const calls = allOptionsData.filter(option => option.details?.contract_type === 'call');
      const puts = allOptionsData.filter(option => option.details?.contract_type === 'put');
      const totalContracts = calls.length + puts.length;
      
      logSuccess(`Fetched MSTR options chain: ${calls.length} calls, ${puts.length} puts (${totalContracts} total)`);
      
      // Store in BigQuery
      if (totalContracts > 0) {
        await storeMSTROptionsInBigQuery(allOptionsData);
        logSuccess(`Successfully stored ${totalContracts} MSTR options contracts in BigQuery`);
      } else {
        logWarning('No MSTR options contracts found to store');
      }
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        timestamp: Date.now(),
        source: 'polygon',
        asset: 'MSTR',
        dataPoints: totalContracts,
        processingTime,
        calls: calls.length,
        puts: puts.length,
        pages: pageCount,
        message: `Successfully processed MSTR options data`,
        note: 'Data has been stored in BigQuery'
      };
      
    } else {
      throw new Error('No options data received from API');
    }
    
  } catch (error) {
    logError(`MSTR options fetcher failed: ${error.message}`);
    return {
      success: false,
      timestamp: Date.now(),
      source: 'polygon',
      asset: 'MSTR',
      error: error.message,
      message: 'Failed to fetch MSTR options data'
    };
  }
}

// Store MSTR options data in BigQuery
async function storeMSTROptionsInBigQuery(optionsData) {
  try {
    const bigquery = new BigQuery({
      projectId: GOOGLE_CLOUD_PROJECT
    });
    
    const dataset = bigquery.dataset(BIGQUERY_DATASET);
    const tableId = 'polygon_options';
    
    // Check if table exists, create if not
    const table = dataset.table(tableId);
    const [tableExists] = await table.exists();
    
    if (!tableExists) {
      logInfo(`Creating table ${tableId}...`);
      
      const schema = [
        { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
        { name: 'underlying_asset', type: 'STRING', mode: 'REQUIRED' },
        { name: 'contract_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'contract_type', type: 'STRING', mode: 'REQUIRED' },
        { name: 'strike_price', type: 'FLOAT64', mode: 'NULLABLE' },
        { name: 'expiration_date', type: 'DATE', mode: 'NULLABLE' },
        { name: 'bid', type: 'FLOAT64', mode: 'NULLABLE' },
        { name: 'ask', type: 'FLOAT64', mode: 'NULLABLE' },
        { name: 'volume', type: 'INT64', mode: 'NULLABLE' },
        { name: 'open_interest', type: 'INT64', mode: 'NULLABLE' },
        { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
      ];
      
      await table.create({ schema, location: 'US' });
      logSuccess(`Table ${tableId} created successfully`);
    }
    
    // Process and insert options data
    const rows = [];
    
    if (optionsData && Array.isArray(optionsData)) {
      // Process all options (calls and puts)
      optionsData.forEach((option, index) => {
        if (option.details) {
          rows.push({
            timestamp: new Date(),
            underlying_asset: 'MSTR',
            contract_id: option.details.ticker || `MSTR_${index}`,
            contract_type: option.details.contract_type || 'unknown',
            strike_price: option.details.strike_price || null,
            expiration_date: option.details.expiration_date || null,
            bid: option.day?.close || null,
            ask: option.day?.close || null, // Using close price as approximation
            volume: option.day?.volume || null,
            open_interest: option.open_interest || null,
            created_at: new Date()
          });
        }
      });
    }
    
    logInfo(`Prepared ${rows.length} rows for BigQuery insertion`);
    
    if (rows.length > 0) {
      await table.insert(rows);
      logSuccess(`Successfully inserted ${rows.length} MSTR options contracts into BigQuery`);
    }
    
  } catch (error) {
    logError(`Error storing MSTR options data in BigQuery: ${error.message}`);
    throw error;
  }
}

// Health check function
async function healthCheck() {
  logHeader('MSTR Options Fetcher Health Check');
  
  try {
    if (!POLYGON_API_KEY) {
      throw new Error('POLYGON_API_KEY not configured');
    }
    
    const response = await axios.get(`https://api.polygon.io/v3/reference/tickers?market=stocks&active=true&limit=1&apiKey=${POLYGON_API_KEY}`);
    
    if (response.status === 200) {
      logSuccess('Health check passed - API is accessible');
      return {
        success: true,
        status: 'healthy',
        apiStatus: 'connected',
        message: 'MSTR options fetcher is working correctly'
      };
    } else {
      throw new Error(`API returned status ${response.status}`);
    }
    
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
    return {
      success: false,
      status: 'unhealthy',
      error: error.message,
      message: 'MSTR options fetcher health check failed'
    };
  }
}

// Main execution function
async function main() {
  log('🚀 Starting MSTR-Only Polygon Options Fetcher...', 'bright');
  
  try {
    // Run health check first
    const healthResult = await healthCheck();
    
    if (healthResult.success) {
      // Fetch MSTR options
      const fetcherResult = await fetchMSTROptions();
      
      // Summary
      logHeader('Execution Results');
      log(`${healthResult.success ? '✅' : '❌'} Health Check: ${healthResult.status}`, healthResult.success ? 'green' : 'red');
      log(`${fetcherResult.success ? '✅' : '❌'} MSTR Options Fetch: ${fetcherResult.success ? 'PASSED' : 'FAILED'}`, fetcherResult.success ? 'green' : 'red');
      
      if (fetcherResult.success) {
        logSuccess(`\n🎉 MSTR options fetcher completed successfully!`);
        logInfo(`Asset: ${fetcherResult.asset}`);
        logInfo(`Data points: ${fetcherResult.dataPoints}`);
        logInfo(`Calls: ${fetcherResult.calls}`);
        logInfo(`Puts: ${fetcherResult.puts}`);
        logInfo(`Processing time: ${fetcherResult.processingTime}ms`);
      }
      
      return fetcherResult;
      
    } else {
      logError('Health check failed, cannot proceed with data fetching');
      return healthResult;
    }
    
  } catch (error) {
    logError(`Main execution failed: ${error.message}`);
    return {
      success: false,
      timestamp: Date.now(),
      source: 'polygon',
      error: error.message
    };
  }
}

// Export functions for Cloud Function deployment
module.exports = {
  fetchMSTROptions,
  healthCheck,
  main
};

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
} 