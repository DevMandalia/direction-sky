#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID=${1:-$(gcloud config get-value project)}
REGION=${2:-us-central1}

if [ -z "${PROJECT_ID}" ]; then
  echo "Project ID not set. Pass as first arg or set gcloud default." >&2
  exit 1
fi

# Required public envs for client
NEXT_PUBLIC_TRADINGVIEW_API_URL=${NEXT_PUBLIC_TRADINGVIEW_API_URL:-"https://us-central1-${PROJECT_ID}.cloudfunctions.net/tradingview-alerts-api"}
NEXT_PUBLIC_BIGQUERY_API_BASE=${NEXT_PUBLIC_BIGQUERY_API_BASE:-"https://us-central1-${PROJECT_ID}.cloudfunctions.net/polygon-options-fetcher"}
NEXT_PUBLIC_BIGQUERY_API_KEY=${NEXT_PUBLIC_BIGQUERY_API_KEY:-""}

echo "Deploying web to Cloud Run: project=${PROJECT_ID} region=${REGION}"

gcloud run deploy direction-sky-web \
  --source . \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --allow-unauthenticated \
  --execution-environment gen2 \
  --update-env-vars NEXT_PUBLIC_TRADINGVIEW_API_URL=${NEXT_PUBLIC_TRADINGVIEW_API_URL},NEXT_PUBLIC_BIGQUERY_API_BASE=${NEXT_PUBLIC_BIGQUERY_API_BASE},NEXT_PUBLIC_BIGQUERY_API_KEY=${NEXT_PUBLIC_BIGQUERY_API_KEY}


