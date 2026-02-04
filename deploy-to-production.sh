#!/bin/bash

# Production Deployment Script
# Requires user confirmation before deploying staging to main

set -e

echo "🚀 AI Query Hub - Production Deployment"
echo "======================================"
echo ""
echo "Current branch: $(git branch --show-current)"
echo "Latest staging commit: $(git log staging --oneline -1)"
echo ""

# Check if we're on staging
if [ "$(git branch --show-current)" != "staging" ]; then
    echo "❌ Error: Must be on staging branch to deploy to production"
    echo "Run: git checkout staging"
    exit 1
fi

# Show what will be deployed
echo "📋 Changes to be deployed to production:"
echo "---------------------------------------"
git log main..staging --oneline | head -10
echo ""

# Require explicit confirmation
echo "⚠️  WARNING: This will merge staging into main (production)"
echo ""
read -p "Type 'yes' to confirm deployment to production: " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "❌ Deployment cancelled. You must type exactly 'yes' to proceed."
    exit 1
fi

echo ""
echo "🔄 Deploying to production..."

# Switch to main and merge staging
git checkout main
git pull origin main
git merge staging --no-ff -m "deploy: merge staging to production

$(git log main..staging --oneline | head -5)

Deployed after manual testing confirmation."

# Push to production
git push origin main

echo ""
echo "✅ Successfully deployed to production!"
echo "🌐 Production is now updated with staging changes"
echo ""
echo "📊 Current production commit: $(git log main --oneline -1)"