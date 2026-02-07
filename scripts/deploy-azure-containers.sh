#!/bin/bash

# TechStack.Studio Azure Container Deployment
# Deploys backend and frontend containers to Azure Container Instances
# Usage: bash scripts/deploy-azure-containers.sh

set -e

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-TechStackStudio}"
REGISTRY_NAME="${REGISTRY_NAME:-techstackstudio}"
REGION="${REGION:-eastus}"
GROQ_API_KEY="${GROQ_API_KEY:-}"
DOMAIN="${DOMAIN:-yourdomain.com}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

echo "🚀 Deploying TechStack.Studio to Azure Container Instances"
echo "==========================================================="
echo ""

# Check environment variables
if [ -z "$GROQ_API_KEY" ]; then
    print_error "GROQ_API_KEY is not set"
    echo "Set with: export GROQ_API_KEY=sk-your-key"
    exit 1
fi

# Get registry credentials
REGISTRY_URL="${REGISTRY_NAME}.azurecr.io"
USERNAME=$(az acr credential show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$REGISTRY_NAME" \
  --query username -o tsv)
PASSWORD=$(az acr credential show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$REGISTRY_NAME" \
  --query passwords[0].value -o tsv)

print_status "Deploying backend container..."
az container create \
  --resource-group "$RESOURCE_GROUP" \
  --name techstack-backend \
  --image "${REGISTRY_URL}/techstack-backend:latest" \
  --cpu 1 \
  --memory 1.5 \
  --port 8000 \
  --environment-variables \
    GROQ_API_KEY="$GROQ_API_KEY" \
    PYTHONUNBUFFERED=1 \
  --registry-login-server "$REGISTRY_URL" \
  --registry-username "$USERNAME" \
  --registry-password "$PASSWORD" \
  --restart-policy Always \
  --dns-name-label "techstack-backend-${REGION}" \
  --protocol TCP \
  --output none

print_status "Backend container deployed"

# Get backend FQDN
BACKEND_FQDN=$(az container show \
  --resource-group "$RESOURCE_GROUP" \
  --name techstack-backend \
  --query ipAddress.fqdn -o tsv)

echo "Backend URL: http://${BACKEND_FQDN}:8000"
echo ""

print_status "Deploying frontend container..."
az container create \
  --resource-group "$RESOURCE_GROUP" \
  --name techstack-frontend \
  --image "${REGISTRY_URL}/techstack-frontend:latest" \
  --cpu 1 \
  --memory 1.5 \
  --port 3000 \
  --environment-variables \
    NEXT_PUBLIC_API_URL="https://${DOMAIN}/api" \
  --registry-login-server "$REGISTRY_URL" \
  --registry-username "$USERNAME" \
  --registry-password "$PASSWORD" \
  --restart-policy Always \
  --dns-name-label "techstack-frontend-${REGION}" \
  --protocol TCP \
  --output none

print_status "Frontend container deployed"

# Get frontend FQDN
FRONTEND_FQDN=$(az container show \
  --resource-group "$RESOURCE_GROUP" \
  --name techstack-frontend \
  --query ipAddress.fqdn -o tsv)

echo "Frontend URL: http://${FRONTEND_FQDN}:3000"
echo ""

echo "✨ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Update your domain DNS CNAME to: $FRONTEND_FQDN"
echo "2. Set up Azure Front Door for SSL/HTTPS"
echo "3. Run: bash scripts/monitor-azure.sh"
echo ""
