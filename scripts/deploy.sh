#!/bin/bash

# TechStack.Studio Update & Redeploy Script
# Pulls latest code and redeploys with Docker
# Run with: bash scripts/deploy.sh

set -e

echo "🚀 Deploying TechStack.Studio"
echo "============================="

# Pull latest code
echo "Pulling latest code..."
git pull origin main

# Rebuild and restart containers
echo "Rebuilding containers..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

echo ""
echo "Waiting for services to start..."
sleep 10

# Check health
echo ""
echo "Service Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "✓ Deployment complete!"
echo ""
echo "View logs with: docker-compose -f docker-compose.prod.yml logs -f"
