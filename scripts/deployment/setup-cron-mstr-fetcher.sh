#!/bin/bash

# MSTR Options Fetcher - Cron Job Setup Script
# This script sets up a cron job to run the MSTR fetcher daily at 7 AM EST

set -e

echo "🚀 Setting up daily MSTR options fetcher cron job..."
echo "Schedule: Daily at 7 AM EST (12 PM UTC)"

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FETCHER_SCRIPT="${SCRIPT_DIR}/polygon-fetcher-mstr-only.js"

# Check if the fetcher script exists
if [ ! -f "$FETCHER_SCRIPT" ]; then
    echo "❌ Error: Fetcher script not found at ${FETCHER_SCRIPT}"
    exit 1
fi

# Create the cron job entry
# 7 AM EST = 12 PM UTC (EST is UTC-5)
CRON_JOB="0 12 * * * cd ${SCRIPT_DIR} && /usr/bin/node ${FETCHER_SCRIPT} >> ${SCRIPT_DIR}/mstr-fetcher.log 2>&1"

echo "📅 Cron job to be added:"
echo "   ${CRON_JOB}"
echo ""

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "polygon-fetcher-mstr-only.js"; then
    echo "⚠️  Warning: A cron job for the MSTR fetcher already exists."
    echo "   Current cron jobs:"
    crontab -l 2>/dev/null | grep "polygon-fetcher-mstr-only.js" || true
    echo ""
    read -p "Do you want to replace it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Replacing existing cron job..."
        # Remove existing job
        crontab -l 2>/dev/null | grep -v "polygon-fetcher-mstr-only.js" | crontab -
    else
        echo "❌ Aborted. Keeping existing cron job."
        exit 0
    fi
fi

# Add the new cron job
echo "⏰ Adding new cron job..."
(crontab -l 2>/dev/null; echo "${CRON_JOB}") | crontab -

echo "✅ Cron job added successfully!"
echo ""
echo "📅 Schedule Details:"
echo "   Time: 7 AM EST (12 PM UTC) daily"
echo "   Script: ${FETCHER_SCRIPT}"
echo "   Log file: ${SCRIPT_DIR}/mstr-fetcher.log"
echo ""
echo "🔍 To view current cron jobs:"
echo "   crontab -l"
echo ""
echo "🔄 To manually run the fetcher:"
echo "   cd ${SCRIPT_DIR} && node ${FETCHER_SCRIPT}"
echo ""
echo "📊 To view logs:"
echo "   tail -f ${SCRIPT_DIR}/mstr-fetcher.log"
echo ""
echo "🗑️  To remove the cron job:"
echo "   crontab -l | grep -v 'polygon-fetcher-mstr-only.js' | crontab -"
echo ""
echo "🎯 The MSTR options fetcher will now run automatically every day at 7 AM EST!" 