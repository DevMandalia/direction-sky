#!/bin/bash

# Comprehensive Cloud Functions Deployment Script
# This script deploys all cloud functions to Google Cloud Console

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[HEADER]${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found. Please copy env.example to .env and configure your API keys."
    exit 1
fi

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    print_error "Google Cloud CLI is not installed. Please install it first: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated with GCP
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    print_error "Not authenticated with Google Cloud. Please run 'gcloud auth login' first."
    exit 1
fi

# Get deployment configuration
PROJECT_ID=${1:-$(gcloud config get-value project)}
REGION=${2:-us-central1}
STAGE=${3:-dev}

if [ -z "$PROJECT_ID" ]; then
    print_error "No project ID specified and no default project set. Please run 'gcloud config set project YOUR_PROJECT_ID' or provide it as the first argument."
    exit 1
fi

print_header "Deploying All Cloud Functions to Google Cloud Platform"
echo "================================================================"
print_status "Project ID: $PROJECT_ID"
print_status "Region: $REGION"
print_status "Stage: $STAGE"

# Load environment variables
print_status "Loading environment variables..."
source .env

# Validate required environment variables
required_vars=("FRED_API_KEY" "COINGLASS_API_KEY" "POLYGON_API_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ] || [[ "${!var}" == *"your_"* ]]; then
        print_warning "Environment variable $var is not properly configured (contains placeholder)."
    fi
done

print_status "Environment variables loaded."

# Install dependencies
print_status "Installing dependencies..."
cd src/functions
npm install
cd ../..

# Build TypeScript
print_status "Building TypeScript..."
npm run type-check

# Enable required APIs
print_status "Enabling required Google Cloud APIs..."
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable bigquery.googleapis.com
gcloud services enable redis.googleapis.com

# Set environment variables for Cloud Functions
ENV_VARS="GLASSNODE_API_KEY=${GLASSNODE_API_KEY:-your_glassnode_api_key_here},COINGLASS_API_KEY=${COINGLASS_API_KEY:-your_coinglass_api_key_here},FRED_API_KEY=${FRED_API_KEY:-your_fred_api_key_here},BINANCE_API_KEY=${BINANCE_API_KEY:-your_binance_api_key_here},BINANCE_SECRET_KEY=${BINANCE_SECRET_KEY:-your_binance_secret_key_here},COINMARKETCAP_API_KEY=${COINMARKETCAP_API_KEY:-your_coinmarketcap_api_key_here},POLYGON_API_KEY=${POLYGON_API_KEY:-your_polygon_api_key_here},PROCESSING_LAYER_URL=${PROCESSING_LAYER_URL:-https://your-processing-layer-url.com/api/ingest},X_API_KEY=${X_API_KEY:-your_twitter_api_key_here},X_API_SECRET=${X_API_SECRET:-your_twitter_api_secret_here},X_BEARER_TOKEN=${X_BEARER_TOKEN:-your_twitter_bearer_token_here},X_MAX_ACCOUNTS=${X_MAX_ACCOUNTS:-23},LOG_EXECUTION_ID=true,BIGQUERY_DATASET=${BIGQUERY_DATASET:-direction_sky_data},REDIS_URL=${REDIS_URL:-redis://localhost:6379},TRADINGVIEW_WEBHOOK_SECRET=${TRADINGVIEW_WEBHOOK_SECRET:-},TRADINGVIEW_RATE_LIMIT_ENABLED=${TRADINGVIEW_RATE_LIMIT_ENABLED:-true},TRADINGVIEW_SIGNATURE_VALIDATION=${TRADINGVIEW_SIGNATURE_VALIDATION:-false}"

# Ensure BigQuery dataset and table for TradingView exist
print_status "Setting up TradingView BigQuery table if missing..."
if ! bq ls $PROJECT_ID:$BIGQUERY_DATASET >/dev/null 2>&1; then
    print_status "Creating dataset $BIGQUERY_DATASET in project $PROJECT_ID"
    bq --location=US mk -d --dataset_id=$PROJECT_ID:$BIGQUERY_DATASET || true
fi

if ! bq ls $PROJECT_ID:$BIGQUERY_DATASET | grep -q "tradingview_alerts"; then
    print_status "Creating table tradingview_alerts"
    # Use repo-standard schema location; substitute dataset if different
    if [ "$BIGQUERY_DATASET" != "direction_sky_data" ]; then
        sed "s/direction_sky_data\\.tradingview_alerts/${BIGQUERY_DATASET}.tradingview_alerts/g" scripts/setup-tradingview-alerts.sql | bq query --use_legacy_sql=false || true
    else
        bq query --use_legacy_sql=false < scripts/setup-tradingview-alerts.sql || true
    fi
else
    print_status "BigQuery table tradingview_alerts already exists"
fi

# Delete failed functions first
print_status "Cleaning up failed functions..."
if gcloud functions describe polygon-test --region=$REGION --format="value(state)" 2>/dev/null | grep -q "FAILED"; then
    print_status "Deleting failed function: polygon-test"
    gcloud functions delete polygon-test --region=$REGION --quiet || true
fi

if gcloud functions describe simple-polygon-test --region=$REGION --format="value(state)" 2>/dev/null | grep -q "FAILED"; then
    print_status "Deleting failed function: simple-polygon-test"
    gcloud functions delete simple-polygon-test --region=$REGION --quiet || true
fi

# Deploy Cloud Functions
print_status "Deploying Cloud Functions..."

# Deploy main data ingestion function
print_status "Deploying data-ingestion function..."
gcloud functions deploy data-ingestion \
    --runtime nodejs24 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --source src/functions \
    --entry-point dataIngestion \
    --set-env-vars $ENV_VARS \
    --memory 512MB \
    --timeout 540s

# Deploy binance data fetcher function
print_status "Deploying binance-fetcher function..."
gcloud functions deploy binance-fetcher \
    --runtime nodejs24 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --source src/functions \
    --entry-point binanceDataFetcher \
    --set-env-vars $ENV_VARS \
    --memory 256MB \
    --timeout 300s

# Deploy coinglass data fetcher function
print_status "Deploying coinglass-fetcher function..."
gcloud functions deploy coinglass-fetcher \
    --runtime nodejs24 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --source src/functions \
    --entry-point coinglassDataFetcher \
    --set-env-vars $ENV_VARS \
    --memory 256MB \
    --timeout 300s

# Deploy coinmarketcap data fetcher function
print_status "Deploying coinmarketcap-fetcher function..."
gcloud functions deploy coinmarketcap-fetcher \
    --runtime nodejs24 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --source src/functions \
    --entry-point coinmarketcapDataFetcher \
    --set-env-vars $ENV_VARS \
    --memory 256MB \
    --timeout 300s

# Deploy data ingestion function
print_status "Deploying data-ingestion function..."
gcloud functions deploy data-ingestion \
    --runtime nodejs24 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --source src/functions \
    --entry-point dataIngestion \
    --set-env-vars $ENV_VARS \
    --memory 512MB \
    --timeout 540s

# Deploy FRED data fetcher function
print_status "Deploying fred-fetcher function..."
gcloud functions deploy fred-fetcher \
    --runtime nodejs24 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --source src/functions \
    --entry-point fredDataFetcher \
    --set-env-vars $ENV_VARS \
    --memory 256MB \
    --timeout 300s

# Deploy glassnode data fetcher function
print_status "Deploying glassnode-fetcher function..."
gcloud functions deploy glassnode-fetcher \
    --runtime nodejs24 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --source src/functions \
    --entry-point glassnodeDataFetcher \
    --set-env-vars $ENV_VARS \
    --memory 256MB \
    --timeout 300s

# Deploy polygon options data fetcher function
print_status "Deploying polygon-options-fetcher function..."
gcloud functions deploy polygon-options-fetcher \
    --runtime nodejs24 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --source src/functions \
    --entry-point polygonOptionsDataFetcher \
    --set-env-vars $ENV_VARS \
    --memory 256MB \
    --timeout 300s

# Deploy polygon health check function
print_status "Deploying polygon-health-check function..."
gcloud functions deploy polygon-health-check \
    --runtime nodejs24 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --source src/functions \
    --entry-point polygonHealthCheck \
    --set-env-vars $ENV_VARS \
    --memory 128MB \
    --timeout 60s

# Deploy TradingView webhook receiver
print_status "Deploying tradingview-webhook-receiver function..."
gcloud functions deploy tradingview-webhook-receiver \
    --runtime nodejs24 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --source src/functions \
    --entry-point tradingviewWebhookReceiver \
    --set-env-vars $ENV_VARS \
    --memory 256MB \
    --timeout 60s

# Deploy TradingView alerts API
print_status "Deploying tradingview-alerts-api function..."
gcloud functions deploy tradingview-alerts-api \
    --runtime nodejs24 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --source src/functions \
    --entry-point tradingviewAlertsApi \
    --set-env-vars $ENV_VARS \
    --memory 512MB \
    --timeout 60s

# Deploy TradingView health check
print_status "Deploying tradingview-health-check function..."
gcloud functions deploy tradingview-health-check \
    --runtime nodejs24 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --source src/functions \
    --entry-point tradingviewHealthCheck \
    --set-env-vars $ENV_VARS \
    --memory 128MB \
    --timeout 30s

# Deploy X data fetcher function
print_status "Deploying x-fetcher function..."
gcloud functions deploy x-fetcher \
    --runtime nodejs24 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --source src/functions \
    --entry-point xDataFetcher \
    --set-env-vars $ENV_VARS \
    --memory 512MB \
    --timeout 540s

# Get the function URL for the scheduler
print_status "Getting function URL for scheduler..."
FRED_FUNCTION_URL=$(gcloud functions describe fred-fetcher --region=$REGION --format='value(httpsTrigger.url)')
X_FUNCTION_URL=$(gcloud functions describe x-fetcher --region=$REGION --format='value(httpsTrigger.url)')

# Create Cloud Scheduler job (delete if exists first)
print_status "Deleting legacy data-ingestion scheduler if it exists..."
gcloud scheduler jobs delete data-ingestion-scheduler --location=$REGION --quiet || true

print_status "Setting up hourly FRED Cloud Scheduler job..."
if gcloud scheduler jobs describe fred-ingestion-hourly --location=$REGION 2>/dev/null; then
    print_status "Updating existing FRED scheduler job..."
    gcloud scheduler jobs update http fred-ingestion-hourly \
        --schedule="0 * * * *" \
        --time-zone="UTC" \
        --uri="$FRED_FUNCTION_URL" \
        --http-method=POST \
        --location=$REGION \
        --project=$PROJECT_ID \
        --description="Triggers FRED data ingestion hourly" \
        --headers="Content-Type=application/json"
else
    print_status "Creating new FRED scheduler job..."
    gcloud scheduler jobs create http fred-ingestion-hourly \
        --schedule="0 * * * *" \
        --time-zone="UTC" \
        --uri="$FRED_FUNCTION_URL" \
        --http-method=POST \
        --location=$REGION \
        --project=$PROJECT_ID \
        --description="Triggers FRED data ingestion hourly" \
        --headers="Content-Type=application/json"
fi

# Create/Update Cloud Scheduler job for X fetcher (hourly)
print_status "Setting up hourly X Cloud Scheduler job..."
if gcloud scheduler jobs describe x-ingestion-hourly --location=$REGION 2>/dev/null; then
    print_status "Updating existing X scheduler job..."
    gcloud scheduler jobs update http x-ingestion-hourly \
        --schedule="0 * * * *" \
        --time-zone="UTC" \
        --uri="$X_FUNCTION_URL" \
        --http-method=POST \
        --location=$REGION \
        --project=$PROJECT_ID \
        --description="Triggers X sentiment data ingestion hourly" \
        --headers="Content-Type=application/json"
else
    print_status "Creating new X scheduler job..."
    gcloud scheduler jobs create http x-ingestion-hourly \
        --schedule="0 * * * *" \
        --time-zone="UTC" \
        --uri="$X_FUNCTION_URL" \
        --http-method=POST \
        --location=$REGION \
        --project=$PROJECT_ID \
        --description="Triggers X sentiment data ingestion hourly" \
        --headers="Content-Type=application/json"
fi

print_status "Deployment completed successfully!"

# Display function information
print_status "Function URLs:"
gcloud functions list --regions=$REGION --format="table(name,httpsTrigger.url,status)"

# Display scheduler information
print_status "Scheduler Jobs:"
gcloud scheduler jobs list --location=$REGION --format="table(name,schedule,state)"

# Display next steps
echo ""
print_status "Next steps:"
echo "1. Monitor function logs: gcloud functions logs read data-ingestion --region=$REGION --limit=50"
echo "2. Test functions: gcloud functions call data-ingestion --region=$REGION"
echo "3. Set up Cloud Monitoring alerts for function errors"
echo "4. Configure the processing layer to receive data"
echo ""
print_warning "Remember to set up proper IAM permissions and Cloud Monitoring alerts for production use."
print_warning "The scheduler will trigger the data-ingestion function every 5 minutes."
print_warning "Some functions may have placeholder API keys - update .env file with real keys for full functionality." 