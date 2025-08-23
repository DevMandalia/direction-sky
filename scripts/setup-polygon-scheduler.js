#!/usr/bin/env node

/**
 * Setup script for Cloud Scheduler to trigger Polygon.io data ingestion
 * Creates scheduled jobs for batch data collection every 5 minutes
 */

const { execSync } = require('child_process');

console.log('⏰ Setting up Cloud Scheduler for Polygon.io data ingestion...\n');

// Configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'dev-epsilon-467101-v2';
const REGION = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
const FUNCTION_URL = process.env.POLYGON_FUNCTION_URL || `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/polygon-options-fetcher`;

const SCHEDULERS = [
  {
    name: 'polygon-batch-ingestion',
    description: 'Triggers Polygon.io batch data collection every 5 minutes during market hours',
    schedule: '*/5 9-16 * * 1-5', // Every 5 minutes, 9 AM - 4 PM, Monday-Friday (ET)
    timeZone: 'America/New_York',
    functionUrl: FUNCTION_URL,
    httpMethod: 'POST',
    body: JSON.stringify({
      assets: [
        { symbol: 'MSTR', asset_type: 'stock', options_enabled: true, real_time_enabled: true, batch_enabled: true },
        { symbol: 'BTC', asset_type: 'crypto', options_enabled: false, real_time_enabled: true, batch_enabled: true }
      ],
      mode: 'batch'
    })
  },
  {
    name: 'polygon-market-open',
    description: 'Triggers Polygon.io data collection at market open (9:30 AM ET)',
    schedule: '30 9 * * 1-5', // 9:30 AM, Monday-Friday (ET)
    timeZone: 'America/New_York',
    functionUrl: FUNCTION_URL,
    httpMethod: 'POST',
    body: JSON.stringify({
      assets: [
        { symbol: 'MSTR', asset_type: 'stock', options_enabled: true, real_time_enabled: true, batch_enabled: true },
        { symbol: 'BTC', asset_type: 'crypto', options_enabled: false, real_time_enabled: true, batch_enabled: true }
      ],
      mode: 'market_open'
    })
  },
  {
    name: 'polygon-market-close',
    description: 'Triggers Polygon.io data collection at market close (4:00 PM ET)',
    schedule: '0 16 * * 1-5', // 4:00 PM, Monday-Friday (ET)
    timeZone: 'America/New_York',
    functionUrl: FUNCTION_URL,
    httpMethod: 'POST',
    body: JSON.stringify({
      assets: [
        { symbol: 'MSTR', asset_type: 'stock', options_enabled: true, real_time_enabled: true, batch_enabled: true },
        { symbol: 'BTC', asset_type: 'crypto', options_enabled: false, real_time_enabled: true, batch_enabled: true }
      ],
      mode: 'market_close'
    })
  }
];

async function setupSchedulers() {
  try {
    // Check if gcloud is installed
    try {
      execSync('gcloud --version', { stdio: 'pipe' });
    } catch (error) {
      console.error('❌ Google Cloud CLI (gcloud) is not installed or not in PATH');
      console.error('Please install it from: https://cloud.google.com/sdk/docs/install');
      process.exit(1);
    }

    // Check if authenticated
    try {
      execSync('gcloud auth list --filter=status:ACTIVE --format="value(account)"', { stdio: 'pipe' });
    } catch (error) {
      console.error('❌ Not authenticated with Google Cloud');
      console.error('Please run: gcloud auth login');
      process.exit(1);
    }

    // Set project
    console.log(`📋 Setting project to: ${PROJECT_ID}`);
    execSync(`gcloud config set project ${PROJECT_ID}`, { stdio: 'inherit' });

    // Create schedulers
    for (const scheduler of SCHEDULERS) {
      console.log(`\n🔧 Setting up scheduler: ${scheduler.name}...`);
      
      try {
        // Check if scheduler already exists
        try {
          execSync(`gcloud scheduler jobs describe ${scheduler.name} --location=${REGION}`, { stdio: 'pipe' });
          console.log(`  ⚠️  Scheduler ${scheduler.name} already exists, updating...`);
          
          // Update existing scheduler
          const updateCommand = [
            'gcloud scheduler jobs update http',
            scheduler.name,
            `--location=${REGION}`,
            `--schedule="${scheduler.schedule}"`,
            `--time-zone="${scheduler.timeZone}"`,
            `--uri="${scheduler.functionUrl}"`,
            `--http-method=${scheduler.httpMethod}`,
            `--message-body='${scheduler.body}'`,
            `--description="${scheduler.description}"`
          ].join(' ');
          
          execSync(updateCommand, { stdio: 'inherit' });
          console.log(`  ✅ Successfully updated scheduler ${scheduler.name}`);
          
        } catch (error) {
          // Scheduler doesn't exist, create new one
          console.log(`  📝 Creating new scheduler ${scheduler.name}...`);
          
          const createCommand = [
            'gcloud scheduler jobs create http',
            scheduler.name,
            `--location=${REGION}`,
            `--schedule="${scheduler.schedule}"`,
            `--time-zone="${scheduler.timeZone}"`,
            `--uri="${scheduler.functionUrl}"`,
            `--http-method=${scheduler.httpMethod}`,
            `--message-body='${scheduler.body}'`,
            `--description="${scheduler.description}"`
          ].join(' ');
          
          execSync(createCommand, { stdio: 'inherit' });
          console.log(`  ✅ Successfully created scheduler ${scheduler.name}`);
        }
        
      } catch (error) {
        console.error(`  ❌ Failed to setup scheduler ${scheduler.name}:`, error.message);
        throw error;
      }
    }

    console.log('\n🎉 All Cloud Schedulers setup successfully!');
    console.log('\n📊 Scheduler Summary:');
    
    for (const scheduler of SCHEDULERS) {
      console.log(`  ${scheduler.name}:`);
      console.log(`    Schedule: ${scheduler.schedule} (${scheduler.timeZone})`);
      console.log(`    Description: ${scheduler.description}`);
    }

    console.log('\n🔍 Next steps:');
    console.log('  1. Verify schedulers are running: gcloud scheduler jobs list --location=' + REGION);
    console.log('  2. Test a scheduler manually: gcloud scheduler jobs run ' + SCHEDULERS[0].name + ' --location=' + REGION);
    console.log('  3. Monitor function logs: gcloud functions logs read polygon-options-fetcher --limit=50');
    console.log('  4. Check BigQuery tables for data ingestion');

  } catch (error) {
    console.error('\n❌ Scheduler setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
if (require.main === module) {
  setupSchedulers();
}

module.exports = { setupSchedulers }; 