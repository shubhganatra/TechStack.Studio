#!/bin/bash

# TechStack.Studio Azure Cleanup Script
# Stops and deletes Azure resources to save costs
# Usage: bash scripts/cleanup-azure.sh

set -e

RESOURCE_GROUP="${RESOURCE_GROUP:-TechStackStudio}"

echo "⚠️  TechStack.Studio Azure Cleanup"
echo "===================================="
echo ""
echo "This will DELETE all resources in resource group: $RESOURCE_GROUP"
echo ""
read -p "Are you sure? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deleting resource group and all resources..."
    az group delete \
      --resource-group "$RESOURCE_GROUP" \
      --yes \
      --no-wait
    
    echo "✓ Resource group deletion initiated"
    echo "This may take several minutes to complete"
else
    echo "Cancelled"
fi
