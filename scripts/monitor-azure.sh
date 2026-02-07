#!/bin/bash

# TechStack.Studio Azure Monitoring Script
# Monitors deployed containers and logs
# Usage: bash scripts/monitor-azure.sh

RESOURCE_GROUP="${RESOURCE_GROUP:-TechStackStudio}"

echo "🏥 TechStack.Studio Azure Monitoring"
echo "===================================="
echo ""

# Check container status
echo "Container Status:"
az container list \
  --resource-group "$RESOURCE_GROUP" \
  --output table

echo ""
echo "Backend Container Details:"
az container show \
  --resource-group "$RESOURCE_GROUP" \
  --name techstack-backend \
  --query "{Name: name, State: instanceView.state, IP: ipAddress.ip, FQDN: ipAddress.fqdn}" \
  --output table

echo ""
echo "Frontend Container Details:"
az container show \
  --resource-group "$RESOURCE_GROUP" \
  --name techstack-frontend \
  --query "{Name: name, State: instanceView.state, IP: ipAddress.ip, FQDN: ipAddress.fqdn}" \
  --output table

echo ""
echo "Backend Logs (last 20 lines):"
az container logs \
  --resource-group "$RESOURCE_GROUP" \
  --name techstack-backend \
  --tail 20

echo ""
echo "Frontend Logs (last 20 lines):"
az container logs \
  --resource-group "$RESOURCE_GROUP" \
  --name techstack-frontend \
  --tail 20

echo ""
echo "To view live logs, run:"
echo "  az container logs --resource-group $RESOURCE_GROUP --name techstack-backend --follow"
echo "  az container logs --resource-group $RESOURCE_GROUP --name techstack-frontend --follow"
