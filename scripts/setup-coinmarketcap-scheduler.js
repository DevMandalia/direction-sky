/*
 * Setup Cloud Scheduler for CoinMarketCap Fear & Greed fetcher
 * - Runs once daily at 00:00 UTC
 * - Targets the deployed HTTP function `coinmarketcap-fetcher`
 */

const { execSync } = require('child_process');

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'dev-epsilon-467101-v2';
const REGION = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
const FUNCTION_URL = process.env.CMC_FUNCTION_URL || `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/coinmarketcap-fetcher`;
const JOB_NAME = process.env.CMC_JOB_NAME || 'coinmarketcap-daily';
const SCHEDULE = process.env.CMC_SCHEDULE || '0 0 * * *'; // 00:00 UTC daily

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

async function setupScheduler() {
  try {
    console.log('⏰ Setting up Cloud Scheduler for CoinMarketCap (daily)...');

    // Ensure gcloud config
    run(`gcloud config set project ${PROJECT_ID}`);

    // Enable APIs if needed
    try { run('gcloud services enable cloudscheduler.googleapis.com'); } catch (_) {}

    // Check if job exists
    let exists = true;
    try {
      execSync(`gcloud scheduler jobs describe ${JOB_NAME} --location=${REGION}`, { stdio: 'pipe' });
    } catch (_) {
      exists = false;
    }

    const baseArgs = [
      `--location=${REGION}`,
      `--schedule="${SCHEDULE}"`,
      `--time-zone="UTC"`,
      `--uri="${FUNCTION_URL}"`,
      `--http-method=GET`,
      `--message-body=''`,
      `--description="CoinMarketCap Fear & Greed daily ingestion"`
    ].join(' ');

    if (exists) {
      console.log(`🔧 Updating existing scheduler: ${JOB_NAME}`);
      run(`gcloud scheduler jobs update http ${JOB_NAME} ${baseArgs}`);
    } else {
      console.log(`📝 Creating scheduler: ${JOB_NAME}`);
      run(`gcloud scheduler jobs create http ${JOB_NAME} ${baseArgs}`);
    }

    console.log('✅ Scheduler configured.');
    console.log('\nNext steps:');
    console.log(`- Verify: gcloud scheduler jobs list --location=${REGION}`);
    console.log(`- Trigger once: gcloud scheduler jobs run ${JOB_NAME} --location=${REGION}`);
    console.log('- Monitor logs: gcloud functions logs read coinmarketcap-fetcher --limit=50');
  } catch (error) {
    console.error('❌ Failed to setup CoinMarketCap scheduler:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  setupScheduler();
}

module.exports = { setupScheduler };


