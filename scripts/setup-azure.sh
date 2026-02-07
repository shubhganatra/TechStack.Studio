#!/bin/bash

# TechStack.Studio Azure Setup Script
# Automates Container Instances deployment on Azure
# Usage: bash scripts/setup-azure.sh <resource-group> <registry-name> <region>

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Get parameters or use defaults
RESOURCE_GROUP=${1:-TechStackStudio}
REGISTRY_NAME=${2:-techstackstudio}
REGION=${3:-eastus}

echo "🚀 TechStack.Studio Azure Setup"
echo "================================"
echo ""
echo "Resource Group: $RESOURCE_GROUP"
echo "Registry: $REGISTRY_NAME"
echo "Region: $REGION"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed"
    echo "Install from: https://docs.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi

print_status "Azure CLI found"

# Check if logged in
if ! az account show &> /dev/null; then
    print_status "Logging in to Azure..."
    az login
fi

print_status "Logged in to Azure"

# Create resource group
print_status "Creating resource group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$REGION" \
  --output none

print_status "Resource group created: $RESOURCE_GROUP"

# Create container registry
print_status "Creating container registry..."
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$REGISTRY_NAME" \
  --sku Basic \
  --output none

print_status "Container registry created: $REGISTRY_NAME"

# Get credentials
print_status "Getting registry credentials..."
REGISTRY_URL="${REGISTRY_NAME}.azurecr.io"
USERNAME=$(az acr credential show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$REGISTRY_NAME" \
  --query username -o tsv)
PASSWORD=$(az acr credential show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$REGISTRY_NAME" \
  --query passwords[0].value -o tsv)

echo ""
echo "📝 Save these credentials:"
echo "Registry URL: $REGISTRY_URL"
echo "Username: $USERNAME"
echo "Password: $PASSWORD"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_warning "Docker is not installed"
    echo "Install from: https://www.docker.com/products/docker-desktop"
    echo "Then run: docker build and docker push commands"
    exit 0
fi

print_status "Docker found"

# Login to registry
print_status "Logging in to container registry..."
az acr login --name "$REGISTRY_NAME"

print_status "Logged in to registry"

# Build and push images
print_status "Building and pushing Docker images..."

if [ -f "backend/Dockerfile" ]; then
    print_status "Building backend image..."
    docker build -t "${REGISTRY_URL}/techstack-backend:latest" ./backend/
    docker push "${REGISTRY_URL}/techstack-backend:latest"
    print_status "Backend image pushed"
else
    print_error "backend/Dockerfile not found"
fi

if [ -f "frontend/Dockerfile" ]; then
    print_status "Building frontend image..."
    docker build -t "${REGISTRY_URL}/techstack-frontend:latest" ./frontend/
    docker push "${REGISTRY_URL}/techstack-frontend:latest"
    print_status "Frontend image pushed"
else
    print_error "frontend/Dockerfile not found"
fi

echo ""
print_status "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Create environment file: cp .env.example .env"
echo "2. Add your GROQ_API_KEY to .env"
echo "3. Run: bash scripts/deploy-azure-containers.sh"
echo ""
