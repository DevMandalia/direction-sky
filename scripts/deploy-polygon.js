#!/usr/bin/env node

/**
 * Deployment script for Polygon.io data ingestion functions
 * Deploys to Google Cloud Functions
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Deploying Polygon.io data ingestion functions to Google Cloud...\n');

// Configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'dev-epsilon-467101-v2';
const REGION = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
const STAGE = process.env.STAGE || 'dev';

const FUNCTIONS = [
  {
    name: 'polygon-options-fetcher',
    entryPoint: 'polygonOptionsDataFetcher',
    source: 'src/functions/index.ts',
    description: 'Polygon.io options, stock, and crypto data fetcher'
  },
  {
    name: 'polygon-health-check',
    entryPoint: 'polygonHealthCheck',
    source: 'src/functions/index.ts',
    description: 'Polygon.io API health check endpoint'
  }
];

async function deployFunctions() {
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

    // Deploy each function
    for (const func of FUNCTIONS) {
      console.log(`\n🔧 Deploying ${func.name}...`);
      
      const deployCommand = [
        'gcloud functions deploy',
        func.name,
        `--gen2`,
        `--runtime=nodejs20`,
        `--region=${REGION}`,
        `--source=src/functions`,
        `--entry-point=${func.entryPoint}`,
        `--trigger-http`,
        `--allow-unauthenticated`,
        `--memory=512MB`,
        `--timeout=540s`,
        `--set-env-vars=STAGE=${STAGE}`,
        `--set-env-vars=GOOGLE_CLOUD_PROJECT=${PROJECT_ID}`,
        `--set-env-vars=GOOGLE_CLOUD_REGION=${REGION}`,
        `--set-env-vars=BIGQUERY_DATASET=direction_sky_data`,
        `--set-env-vars=BIGQUERY_PROJECT_ID=${PROJECT_ID}`,
        `--set-env-vars=GOOGLE_APPLICATION_CREDENTIALS=`,  // Empty value for default service account
        `--set-env-vars=PROCESSING_LAYER_URL=${process.env.PROCESSING_LAYER_URL || 'https://your-processing-layer-url.com/api/ingest'}`
      ].join(' ');

      try {
        execSync(deployCommand, { stdio: 'inherit' });
        console.log(`✅ Successfully deployed ${func.name}`);
      } catch (error) {
        console.error(`❌ Failed to deploy ${func.name}:`, error.message);
        throw error;
      }
    }

    console.log('\n🎉 All Polygon.io functions deployed successfully!');
    console.log('\n📊 Function URLs:');
    
    for (const func of FUNCTIONS) {
      const url = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${func.name}`;
      console.log(`  ${func.name}: ${url}`);
    }

    console.log('\n🔍 Next steps:');
    console.log('  1. Set your POLYGON_API_KEY environment variable');
    console.log('  2. Test the health check endpoint');
    console.log('  3. Configure Cloud Scheduler to trigger the fetcher every 5 minutes');
    console.log('  4. Monitor logs: gcloud functions logs read polygon-options-fetcher --limit=50');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run deployment
if (require.main === module) {
  deployFunctions();
}

module.exports = { deployFunctions }; 