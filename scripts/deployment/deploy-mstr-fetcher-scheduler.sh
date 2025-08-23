#!/bin/bash

# MSTR Options Fetcher - Daily Schedule Deployment Script
# This script sets up Cloud Scheduler to run the MSTR fetcher daily at 7 AM EST

set -e

# Configuration
PROJECT_ID="dev-epsilon-467101-v2"
REGION="us-central1"
SCHEDULER_NAME="mstr-options-fetcher-daily"
SCHEDULE="0 12 * * *"  # 7 AM EST = 12 PM UTC (EST is UTC-5)
TIMEZONE="America/New_York"
FUNCTION_NAME="mstr-options-fetcher"  # Your deployed Cloud Function name
FUNCTION_URL="https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}"

echo "🚀 Setting up daily MSTR options fetcher schedule..."
echo "Project: ${PROJECT_ID}"
echo "Schedule: ${SCHEDULE} (${TIMEZONE})"
echo "Function: ${FUNCTION_NAME}"

# Check if gcloud is configured
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Error: gcloud not authenticated. Please run 'gcloud auth login' first."
    exit 1
fi

# Set the project
echo "📋 Setting project to ${PROJECT_ID}..."
gcloud config set project ${PROJECT_ID}

# Create or update the Cloud Scheduler job
echo "⏰ Creating/updating Cloud Scheduler job..."
gcloud scheduler jobs create http ${SCHEDULER_NAME} \
    --schedule="${SCHEDULE}" \
    --time-zone="${TIMEZONE}" \
    --uri="${FUNCTION_URL}" \
    --http-method=POST \
    --headers="Content-Type=application/json" \
    --message-body='{"scheduled": true, "source": "cloud-scheduler"}' \
    --description="Daily MSTR options data fetch at 7 AM EST before market open" \
    --location=${REGION} \
    --attempt-deadline=10m \
    --max-retry-attempts=3 \
    --max-backoff=10s \
    --min-backoff=5s \
    --retry-count=3 \
    --replace

echo "✅ Cloud Scheduler job created successfully!"
echo ""
echo "📅 Schedule Details:"
echo "   Name: ${SCHEDULER_NAME}"
echo "   Schedule: ${SCHEDULE}"
echo "   Timezone: ${TIMEZONE}"
echo "   Function: ${FUNCTION_NAME}"
echo "   URL: ${FUNCTION_URL}"
echo ""
echo "🔍 To view the scheduler:"
echo "   gcloud scheduler jobs describe ${SCHEDULER_NAME} --location=${REGION}"
echo ""
echo "🔄 To manually trigger a run:"
echo "   gcloud scheduler jobs run ${SCHEDULER_NAME} --location=${REGION}"
echo ""
echo "📊 To view execution history:"
echo "   gcloud scheduler jobs list-executions ${SCHEDULER_NAME} --location=${REGION}"
echo ""
echo "🎯 The MSTR options fetcher will now run automatically every day at 7 AM EST!" 