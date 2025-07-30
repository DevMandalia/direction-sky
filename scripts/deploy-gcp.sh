#!/bin/bash

# Data Ingestion Layer Deployment Script for Google Cloud Platform
# This script deploys the Cloud Functions and Cloud Scheduler to GCP

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

print_header "Deploying Data Ingestion Layer to Google Cloud Platform"
echo "================================================================"
print_status "Project ID: $PROJECT_ID"
print_status "Region: $REGION"
print_status "Stage: $STAGE"

# Load environment variables
print_status "Loading environment variables..."
source .env

# Validate required environment variables
required_vars=("GLASSNODE_API_KEY" "COINGLASS_API_KEY" "FRED_API_KEY" "PROCESSING_LAYER_URL" "X_API_KEY" "X_API_SECRET" "X_BEARER_TOKEN")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set."
        exit 1
    fi
done

print_status "All required environment variables are set."

# Install dependencies
print_status "Installing dependencies..."
npm install

# Build TypeScript
print_status "Building TypeScript..."
npm run type-check
npx tsc

# Enable required APIs
print_status "Enabling required Google Cloud APIs..."
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Set environment variables for Cloud Functions
ENV_VARS="GLASSNODE_API_KEY=$GLASSNODE_API_KEY,COINGLASS_API_KEY=$COINGLASS_API_KEY,FRED_API_KEY=$FRED_API_KEY,BINANCE_API_KEY=$BINANCE_API_KEY,BINANCE_SECRET_KEY=$BINANCE_SECRET_KEY,PROCESSING_LAYER_URL=$PROCESSING_LAYER_URL,X_API_KEY=$X_API_KEY,X_API_SECRET=$X_API_SECRET,X_BEARER_TOKEN=$X_BEARER_TOKEN,X_MAX_ACCOUNTS=${X_MAX_ACCOUNTS:-23}"

# Deploy Cloud Functions
print_status "Deploying Cloud Functions..."

# Deploy main data ingestion function
print_status "Deploying data-ingestion function..."
gcloud functions deploy data-ingestion \
    --runtime nodejs18 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --entry-point data-ingestion \
    --set-env-vars $ENV_VARS \
    --memory 512MB \
    --timeout 540s

# Deploy individual data fetcher functions
print_status "Deploying glassnode-fetcher function..."
gcloud functions deploy glassnode-fetcher \
    --runtime nodejs18 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --entry-point glassnode-fetcher \
    --set-env-vars $ENV_VARS \
    --memory 256MB \
    --timeout 300s

print_status "Deploying coinglass-fetcher function..."
gcloud functions deploy coinglass-fetcher \
    --runtime nodejs18 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --entry-point coinglass-fetcher \
    --set-env-vars $ENV_VARS \
    --memory 256MB \
    --timeout 300s

print_status "Deploying fred-fetcher function..."
gcloud functions deploy fred-fetcher \
    --runtime nodejs18 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --entry-point fred-fetcher \
    --set-env-vars $ENV_VARS \
    --memory 256MB \
    --timeout 300s

print_status "Deploying binance-fetcher function..."
gcloud functions deploy binance-fetcher \
    --runtime nodejs18 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --entry-point binance-fetcher \
    --set-env-vars $ENV_VARS \
    --memory 256MB \
    --timeout 300s

print_status "Deploying x-fetcher function..."
gcloud functions deploy x-fetcher \
    --runtime nodejs18 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --entry-point x-fetcher \
    --set-env-vars $ENV_VARS \
    --memory 512MB \
    --timeout 540s

# Get the function URL for the scheduler
print_status "Getting function URL for scheduler..."
FUNCTION_URL=$(gcloud functions describe data-ingestion --region=$REGION --format='value(httpsTrigger.url)')

# Create Cloud Scheduler job
print_status "Creating Cloud Scheduler job..."
gcloud scheduler jobs create http data-ingestion-scheduler \
    --schedule="*/5 * * * *" \
    --uri="$FUNCTION_URL" \
    --http-method=POST \
    --location=$REGION \
    --project=$PROJECT_ID \
    --description="Triggers data ingestion every 5 minutes" \
    --headers="Content-Type=application/json"

print_status "Deployment completed successfully!"

# Display function information
print_status "Function URLs:"
gcloud functions list --region=$REGION --format="table(name,httpsTrigger.url,status)"

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