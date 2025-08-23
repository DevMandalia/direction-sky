// Executes the single source-of-truth SQL to (re)create the polygon_options table
// Aligns with setup_new_schema.sql in the repo root

const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');
const path = require('path');

const main = async () => {
  try {
    const bigquery = new BigQuery();

    const sqlPath = path.resolve(__dirname, '..', 'setup_new_schema.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ SQL file not found at: ${sqlPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    if (!sql || sql.trim().length === 0) {
      console.error('❌ SQL file is empty.');
      process.exit(1);
    }

    console.log('📄 Loaded SQL from setup_new_schema.sql');
    console.log('🚀 Executing schema update against BigQuery...');

    // BigQuery supports multi-statement queries separated by semicolons
    const [job] = await bigquery.createQueryJob({
      query: sql,
      // Set your dataset location if needed. US is common for us-central1.
      location: 'US',
    });

    console.log(`🧵 Job ${job.id} started. Waiting for completion...`);
    const [rows] = await job.getQueryResults();

    console.log('✅ Schema update completed.');

    if (Array.isArray(rows) && rows.length > 0) {
      console.log('ℹ️ Verification output:');
      for (const row of rows) {
        console.log(JSON.stringify(row));
      }
    } else {
      console.log('ℹ️ No verification rows returned (this is fine if the final SELECT produced no rows).');
    }
  } catch (error) {
    console.error('❌ Failed to update polygon_options schema:\n', error);
    process.exit(1);
  }
};

main();
