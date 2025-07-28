#!/bin/bash

# Data Ingestion Layer Deployment Script
# This script deploys the serverless data ingestion functions to AWS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found. Please copy env.example to .env and configure your API keys."
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if serverless framework is installed
if ! command -v serverless &> /dev/null; then
    print_error "Serverless Framework is not installed. Please install it first: npm install -g serverless"
    exit 1
fi

# Check if user is authenticated with AWS
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "Not authenticated with AWS. Please run 'aws configure' first."
    exit 1
fi

# Get deployment stage from command line argument or default to 'dev'
STAGE=${1:-dev}
print_status "Deploying to stage: $STAGE"

# Load environment variables
print_status "Loading environment variables..."
source .env

# Validate required environment variables
required_vars=("GLASSNODE_API_KEY" "COINGLASS_API_KEY" "FRED_API_KEY" "PROCESSING_LAYER_URL")
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

# Run type check
print_status "Running TypeScript type check..."
npm run type-check

# Deploy using serverless framework
print_status "Deploying serverless functions..."
serverless deploy --stage $STAGE

print_status "Deployment completed successfully!"

# Display function information
print_status "Function information:"
serverless info --stage $STAGE

# Display next steps
echo ""
print_status "Next steps:"
echo "1. Monitor function logs: npm run logs"
echo "2. Test functions: npm run invoke"
echo "3. Set up CloudWatch alarms for monitoring"
echo "4. Configure the processing layer to receive data"
echo ""
print_warning "Remember to set up proper IAM permissions and CloudWatch alarms for production use." 