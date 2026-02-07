#!/bin/bash

# TechStack.Studio Health Check Script
# Monitors the health of your deployed application
# Run with: bash scripts/health-check.sh

echo "🏥 TechStack.Studio Health Check"
echo "================================="
echo ""

# Check Docker
echo "Checking Docker..."
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "✓ Docker services are running"
else
    echo "✗ Docker services are not running"
    exit 1
fi

echo ""
echo "Service Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "Frontend Health:"
if curl -s http://localhost:3000 > /dev/null; then
    echo "✓ Frontend is responding"
else
    echo "✗ Frontend is not responding"
fi

echo ""
echo "Backend Health:"
if curl -s http://localhost:8000 > /dev/null; then
    echo "✓ Backend is responding"
else
    echo "✗ Backend is not responding"
fi

echo ""
echo "Recent Logs (Backend):"
docker-compose -f docker-compose.prod.yml logs --tail=5 backend

echo ""
echo "Recent Logs (Frontend):"
docker-compose -f docker-compose.prod.yml logs --tail=5 frontend
