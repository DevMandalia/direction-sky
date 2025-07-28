#!/bin/bash

# Build script for Google Cloud Functions
# This script compiles TypeScript and prepares the deployment

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "Building TypeScript for Google Cloud Functions..."

# Check if TypeScript is installed
if ! command -v npx tsc &> /dev/null; then
    print_error "TypeScript compiler not found. Installing..."
    npm install -g typescript
fi

# Clean previous build
print_status "Cleaning previous build..."
rm -rf dist/

# Run type check
print_status "Running TypeScript type check..."
npx tsc --noEmit

# Compile TypeScript
print_status "Compiling TypeScript..."
npx tsc

# Copy package.json to dist for deployment
print_status "Preparing deployment package..."
cp package.json dist/
cp index.js dist/

# Install production dependencies in dist
print_status "Installing production dependencies..."
cd dist
npm install --production
cd ..

print_status "Build completed successfully!"
print_status "Deployment package ready in dist/ directory" 