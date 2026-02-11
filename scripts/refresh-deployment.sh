#!/bin/bash

# TechStack.Studio - Complete Deployment Refresh Script
# Usage: bash scripts/refresh-deployment.sh

set -e

echo "======================================================================"
echo "🔄 TechStack.Studio - Complete Refresh & Rebuild"
echo "======================================================================"

cd "$(dirname "$0")/.." || exit 1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Stop all containers
echo -e "${YELLOW}1. Stopping containers...${NC}"
docker compose -f docker-compose.prod.yml down || true

# 2. Remove old images
echo -e "${YELLOW}2. Removing old Docker images...${NC}"
docker image rm techstackstudio-backend:latest || true
docker image rm techstackstudio-frontend:latest || true
docker image rm nginx:alpine || true

# 3. Prune unused images, containers, networks, and volumes
echo -e "${YELLOW}3. Pruning Docker system...${NC}"
docker system prune -af --volumes

# 4. Clean local build artifacts (preserve visitor logs)
echo -e "${YELLOW}4. Cleaning local build artifacts...${NC}"
rm -rf frontend/.next || true
rm -rf frontend/node_modules/.cache || true
rm -rf backend/__pycache__ || true
rm -rf backend/.pytest_cache || true
# Archive current logs before cleaning (with permission handling)
if [ -f "backend/logs/visitor_access.log" ]; then
    mkdir -p backend/logs/archived 2>/dev/null || sudo mkdir -p backend/logs/archived
    cp "backend/logs/visitor_access.log" "backend/logs/archived/visitor_access_$(date +%Y%m%d_%H%M%S).log" 2>/dev/null || \
    sudo cp "backend/logs/visitor_access.log" "backend/logs/archived/visitor_access_$(date +%Y%m%d_%H%M%S).log" || true
    echo "   📝 Archived visitor logs" || true
fi
# Ensure logs directory exists and has proper permissions
mkdir -p backend/logs 2>/dev/null || sudo mkdir -p backend/logs
sudo chmod 755 backend/logs 2>/dev/null || true

# 5. Check disk space
echo -e "${YELLOW}5. Checking disk space...${NC}"
df -h /

# 6. Pull latest code from GitHub
echo -e "${YELLOW}6. Pulling latest code from GitHub...${NC}"
git pull origin main || echo "Git pull skipped (SSH may not be configured)"

# 7. Rebuild all services
echo -e "${YELLOW}7. Building all Docker images (no cache)...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache

# 8. Start all services
echo -e "${YELLOW}8. Starting services...${NC}"
docker compose -f docker-compose.prod.yml up -d

# 9. Wait for services to be ready
echo -e "${YELLOW}9. Waiting for services to be ready...${NC}"
sleep 20

# 10. Check service status
echo -e "${YELLOW}10. Service Status:${NC}"
docker compose -f docker-compose.prod.yml ps

# 11. Health checks
echo -e "${YELLOW}11. Running health checks...${NC}"
echo "   - Backend: $(curl -s http://localhost:8000/ | head -c 50)..."
echo "   - Frontend: $(curl -s http://localhost:3000/ | head -c 50)..."
echo "   - Nginx: $(curl -s http://localhost:80/ | head -c 50)..."

# 12. Initialize visitor logging
echo -e "${YELLOW}12. Initializing visitor logging...${NC}"
mkdir -p backend/logs
echo "   📝 Visitor logging directory ready"
echo "   ✅ Logs will be written to: backend/logs/visitor_access.log"

echo ""
echo "======================================================================"
echo -e "${GREEN}✅ Deployment refresh complete!${NC}"
echo "======================================================================"
echo ""
echo "Next steps:"
echo "  1. Open https://techstack.studio in your browser"
echo "  2. Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux)"
echo "  3. Test the application"
echo ""
echo "View logs and visitor activity:"
echo "  - All logs:         docker compose -f docker-compose.prod.yml logs -f"
echo "  - Backend logs:     docker compose -f docker-compose.prod.yml logs -f backend"
echo "  - Visitor activity: tail -f backend/logs/visitor_access.log"
echo "  - Live monitoring:  ./scripts/monitor-visitor-logs.sh --live"
echo "  - Generate report:  ./scripts/analyze-visitor-logs.sh summary"
echo ""
