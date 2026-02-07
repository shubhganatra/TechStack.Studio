# TechStack.Studio Azure Deployment Guide

Complete guide to deploying TechStack.Studio on Azure using your student credits.

## Azure Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Your Domain                          │
│              (yourdomain.com)                           │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   Azure Front Door / CDN     │
        │  (SSL/TLS Termination)       │
        └──────────────┬───────────────┘
                       │
        ┌──────────────┴────────────┐
        │                           │
        ▼                           ▼
┌────────────────────┐    ┌────────────────────┐
│  Container         │    │  Container         │
│  Instance          │    │  Instance          │
│  (Frontend)        │    │  (Backend)         │
│  Port 3000         │    │  Port 8000         │
└────────────────────┘    └────────────────────┘
        │                           │
        └───────────────┬───────────┘
                        │
                        ▼
            ┌────────────────────────┐
            │   Azure SQL Database   │
            │   (Optional)           │
            └────────────────────────┘
```

---

## Cost Breakdown for $100 Student Credits

### Free Tier Services (Always Free)
- **Azure Container Registry**: Free tier (12GB storage)
- **Azure Key Vault**: Free tier (1000 operations/month)

### Services Using Credits ($100)

| Service | Cost/Month | Duration |
|---------|-----------|----------|
| **Container Instances** (2x small: 1 vCPU, 1.5GB RAM) | ~$35-45 | 2-3 months |
| **Azure Front Door** (basic) | ~$0 (data included in Container Instances) | 2-3 months |
| **SSL Certificates** | $0 (Let's Encrypt free) | Forever |
| **Storage Account** (logs, assets) | ~$0-5 | 2-3 months |
| **Bandwidth** (first 1TB/month free) | $0 | 2-3 months |
| | | |
| **TOTAL MONTHLY** | **$35-45** | **2-3 months on $100** |

### Alternative: App Service Plan (Better for longer duration)
| Service | Cost/Month | Duration |
|---------|-----------|----------|
| **App Service Plan** (B1 tier: shared) | ~$10 | 10 months |
| **SQL Database** (B tier: basic) | ~$5 | 20 months |
| **CDN** (optional) | ~$0 | Included |
| **SSL Certificates** | $0 (Let's Encrypt free) | Forever |
| | | |
| **TOTAL MONTHLY** | **$15** | **6+ months on $100** |

---

## Prerequisites

1. **Azure Account** with student credits
   - Sign up at https://azure.microsoft.com/en-us/free/students/
   - Get $100 in free credits valid for 12 months
2. **Azure CLI** installed
   - Download: https://docs.microsoft.com/cli/azure/install-azure-cli
3. **Docker** installed locally for image building
4. **Git** repository (GitHub, Azure Repos, etc.)
5. **Domain Name** (you already have)

---

## Option A: Azure Container Instances (Fastest Deployment)

Best for: Quick deployment, development/testing, **optimal for student credits**

### Step 1: Set Up Azure CLI

```bash
# Install Azure CLI (if not already installed)
# macOS:
brew install azure-cli

# Or download from: https://docs.microsoft.com/cli/azure/install-azure-cli

# Login to Azure
az login

# Set your subscription (if you have multiple)
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Verify login
az account show
```

### Step 2: Create Resource Group

```bash
# Create a resource group (container for all resources)
az group create \
  --name TechStackStudio \
  --location eastus  # Change to closest region to you

# List resource groups to verify
az group list --output table
```

### Step 3: Create Azure Container Registry

Store your Docker images in Azure.

```bash
# Create Container Registry
az acr create \
  --resource-group TechStackStudio \
  --name techstackstudio \
  --sku Basic  # Free tier

# Get login credentials
az acr credential show \
  --resource-group TechStackStudio \
  --name techstackstudio

# Save these credentials - you'll need them!
```

### Step 4: Build and Push Docker Images

```bash
# Navigate to your project
cd /path/to/TechStack.Studio

# Login to your Azure Container Registry
az acr login --name techstackstudio

# Set your registry URL
REGISTRY=techstackstudio.azurecr.io

# Build backend image
docker build -t $REGISTRY/techstack-backend:latest ./backend/
docker push $REGISTRY/techstack-backend:latest

# Build frontend image
docker build -t $REGISTRY/techstack-frontend:latest ./frontend/
docker push $REGISTRY/techstack-frontend:latest

# Verify images pushed
az acr repository list --name techstackstudio
```

### Step 5: Create Container Instances

#### Deploy Backend Container

```bash
az container create \
  --resource-group TechStackStudio \
  --name techstack-backend \
  --image techstackstudio.azurecr.io/techstack-backend:latest \
  --cpu 1 \
  --memory 1.5 \
  --port 8000 \
  --environment-variables \
    GROQ_API_KEY=sk-YOUR_GROQ_KEY \
    PYTHONUNBUFFERED=1 \
  --registry-login-server techstackstudio.azurecr.io \
  --registry-username <username-from-step-3> \
  --registry-password <password-from-step-3> \
  --restart-policy Always \
  --dns-name-label techstack-backend \
  --protocol TCP

# Get the FQDN (you'll need this for frontend)
az container show \
  --resource-group TechStackStudio \
  --name techstack-backend \
  --query ipAddress.fqdn
```

#### Deploy Frontend Container

```bash
# First, get your backend FQDN from above
BACKEND_URL="techstack-backend.eastus.azurecontainer.io:8000"

az container create \
  --resource-group TechStackStudio \
  --name techstack-frontend \
  --image techstackstudio.azurecr.io/techstack-frontend:latest \
  --cpu 1 \
  --memory 1.5 \
  --port 3000 \
  --environment-variables \
    NEXT_PUBLIC_API_URL=https://yourdomain.com/api \
  --registry-login-server techstackstudio.azurecr.io \
  --registry-username <username-from-step-3> \
  --registry-password <username-from-step-3> \
  --restart-policy Always \
  --dns-name-label techstack-frontend \
  --protocol TCP

# Get the frontend FQDN
az container show \
  --resource-group TechStackStudio \
  --name techstack-frontend \
  --query ipAddress.fqdn
```

### Step 6: Set Up Azure Front Door (SSL & Reverse Proxy)

Azure Front Door provides SSL termination and reverse proxy functionality (replacing Nginx).

```bash
# Create Front Door and routing rules
az afd profile create \
  --resource-group TechStackStudio \
  --profile-name TechStackStudio \
  --sku Premium

# Create endpoint
az afd endpoint create \
  --resource-group TechStackStudio \
  --profile-name TechStackStudio \
  --endpoint-name techstack

# Create origin group for backend
az afd origin-group create \
  --resource-group TechStackStudio \
  --profile-name TechStackStudio \
  --origin-group-name backend \
  --probe-request-type GET \
  --probe-protocol Http \
  --probe-interval 100

# Create origin group for frontend
az afd origin-group create \
  --resource-group TechStackStudio \
  --profile-name TechStackStudio \
  --origin-group-name frontend \
  --probe-request-type GET \
  --probe-protocol Http \
  --probe-interval 100

# Add backend origin
az afd origin create \
  --resource-group TechStackStudio \
  --profile-name TechStackStudio \
  --origin-group-name backend \
  --origin-name backend-origin \
  --origin-host-header "techstack-backend.eastus.azurecontainer.io" \
  --origin-http-port 8000 \
  --origin-https-port 443 \
  --priority 1 \
  --weight 1000

# Add frontend origin
az afd origin create \
  --resource-group TechStackStudio \
  --profile-name TechStackStudio \
  --origin-group-name frontend \
  --origin-name frontend-origin \
  --origin-host-header "techstack-frontend.eastus.azurecontainer.io" \
  --origin-http-port 3000 \
  --origin-https-port 443 \
  --priority 1 \
  --weight 1000
```

### Step 7: Connect Your Domain

```bash
# Add your domain to Azure
az afd custom-domain create \
  --resource-group TechStackStudio \
  --profile-name TechStackStudio \
  --custom-domain-name yourdomain \
  --host-name yourdomain.com

# Update your domain's DNS records to point to Azure Front Door
# Add CNAME: yourdomain.com -> TechStackStudio.azurefd.net
```

### Step 8: Monitor and Manage

```bash
# View container logs
az container logs \
  --resource-group TechStackStudio \
  --name techstack-backend \
  --follow

az container logs \
  --resource-group TechStackStudio \
  --name techstack-frontend \
  --follow

# Check container status
az container list \
  --resource-group TechStackStudio \
  --output table

# Stop container
az container stop \
  --resource-group TechStackStudio \
  --name techstack-backend

# Restart container
az container restart \
  --resource-group TechStackStudio \
  --name techstack-backend

# Delete container
az container delete \
  --resource-group TechStackStudio \
  --name techstack-backend
```

---

## Option B: Azure App Service (Recommended for Longevity)

Better for: Running longer on student credits, easier management, auto-scaling

### Step 1: Create App Service Plan

```bash
# Create App Service Plan (B1 tier = ~$10/month = 10 months on $100)
az appservice plan create \
  --name TechStackStudio-Plan \
  --resource-group TechStackStudio \
  --is-linux \
  --sku B1  # B1 = Basic tier, good for student projects

# Verify
az appservice plan list --resource-group TechStackStudio --output table
```

### Step 2: Create Web Apps

#### Deploy Backend

```bash
az webapp create \
  --resource-group TechStackStudio \
  --plan TechStackStudio-Plan \
  --name techstack-studio-api \
  --deployment-container-image-name techstackstudio.azurecr.io/techstack-backend:latest

# Configure container settings
az webapp config container set \
  --name techstack-studio-api \
  --resource-group TechStackStudio \
  --docker-custom-image-name techstackstudio.azurecr.io/techstack-backend:latest \
  --docker-registry-server-url https://techstackstudio.azurecr.io \
  --docker-registry-server-user <username> \
  --docker-registry-server-password <password>

# Set environment variables
az webapp config appsettings set \
  --name techstack-studio-api \
  --resource-group TechStackStudio \
  --settings GROQ_API_KEY=sk-YOUR_KEY PYTHONUNBUFFERED=1

# Get the URL
az webapp show \
  --name techstack-studio-api \
  --resource-group TechStackStudio \
  --query defaultHostName
```

#### Deploy Frontend

```bash
az webapp create \
  --resource-group TechStackStudio \
  --plan TechStackStudio-Plan \
  --name techstack-studio-web \
  --deployment-container-image-name techstackstudio.azurecr.io/techstack-frontend:latest

# Configure container settings
az webapp config container set \
  --name techstack-studio-web \
  --resource-group TechStackStudio \
  --docker-custom-image-name techstackstudio.azurecr.io/techstack-frontend:latest \
  --docker-registry-server-url https://techstackstudio.azurecr.io \
  --docker-registry-server-user <username> \
  --docker-registry-server-password <password>

# Set environment variables
az webapp config appsettings set \
  --name techstack-studio-web \
  --resource-group TechStackStudio \
  --settings NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# Get the URL
az webapp show \
  --name techstack-studio-web \
  --resource-group TechStackStudio \
  --query defaultHostName
```

### Step 3: Configure Custom Domain and SSL

```bash
# Add custom domain to frontend web app
az webapp config hostname add \
  --webapp-name techstack-studio-web \
  --resource-group TechStackStudio \
  --hostname yourdomain.com

# Update your domain DNS CNAME to point to Azure
# CNAME: yourdomain.com -> techstack-studio-web.azurewebsites.net

# Create SSL certificate (free with App Service)
az webapp config ssl bind \
  --certificate-thumbprint YOUR_CERT_THUMBPRINT \
  --ssl-type SNI \
  --name techstack-studio-web \
  --resource-group TechStackStudio

# Or use Let's Encrypt via Azure automation
```

### Step 4: Set Up Application Gateway (API Routing)

```bash
# Create Application Gateway for routing /api to backend
az network application-gateway create \
  --name TechStackStudio-AppGW \
  --resource-group TechStackStudio \
  --vnet-name TechStackStudio-VNet \
  --capacity 2 \
  --sku Standard_v2 \
  --http-settings-cookie-based-affinity Disabled \
  --frontend-port 443 \
  --http-settings-port 80 \
  --cert-file /path/to/cert.pfx \
  --cert-password YOUR_PASSWORD
```

---

## Step 9: Set Up Continuous Deployment

Automatically redeploy when you push to GitHub.

```bash
# Enable CI/CD from GitHub
az webapp deployment github-actions add \
  --repo-url https://github.com/yourusername/TechStack.Studio \
  --branch main \
  --name techstack-studio-api \
  --resource-group TechStackStudio

az webapp deployment github-actions add \
  --repo-url https://github.com/yourusername/TechStack.Studio \
  --branch main \
  --name techstack-studio-web \
  --resource-group TechStackStudio
```

---

## Cost Optimization Tips

### To Extend Your $100 Credits

1. **Use Spot Instances** (Container Instances)
   - Save up to 70% on compute
   ```bash
   az container create \
     --priority Spot \
     ...
   ```

2. **Schedule Containers** to stop when not in use
   ```bash
   # Stop at night/weekends
   az container stop \
     --resource-group TechStackStudio \
     --name techstack-backend
   ```

3. **Use Azure Reserved Instances** (if planning long-term)
   - 1-year reservation saves ~25%

4. **Monitor Spending**
   ```bash
   # Check current costs
   az billing account list --output table
   ```

5. **Upgrade Only When Needed**
   - Start with B1/small instance
   - Upgrade only if you need more resources

### Expected Duration of $100

| Option | Monthly Cost | Duration |
|--------|-------------|----------|
| Container Instances (1 CPU, 1.5GB) | $35-45 | 2-3 months |
| App Service B1 + Database | $15-20 | 5-7 months |
| App Service B1 only | $10 | 10 months |

---

## Monitoring and Logs

### View Container Logs

```bash
# Container Instances
az container logs \
  --resource-group TechStackStudio \
  --name techstack-backend \
  --follow

# App Service
az webapp log tail \
  --name techstack-studio-api \
  --resource-group TechStackStudio
```

### Monitor Performance

```bash
# View metrics
az monitor metrics list \
  --resource /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/TechStackStudio/providers/Microsoft.ContainerInstance/containerGroups/techstack-backend \
  --metric CpuUsage MemoryUsage
```

### Set Up Alerts

```bash
# Alert when CPU > 80%
az monitor metrics alert create \
  --resource /subscriptions/YOUR_SUBSCRIPTION_ID/... \
  --name HighCPU \
  --condition "avg CpuUsage > 80"
```

---

## Scaling Your Application

### Vertical Scaling (Bigger Instances)

```bash
# App Service
az appservice plan update \
  --name TechStackStudio-Plan \
  --sku B2  # Upgrade from B1 to B2

# Container Instances - redeploy with larger specs
az container create \
  --cpu 2 \
  --memory 3.5 \
  ...
```

### Horizontal Scaling (Multiple Instances)

```bash
# App Service - auto-scale
az monitor autoscale create \
  --resource-group TechStackStudio \
  --resource-type "Microsoft.Web/serverFarms" \
  --resource-name TechStackStudio-Plan \
  --min-count 1 \
  --max-count 3 \
  --count 1
```

---

## Comparing AWS vs Azure

| Feature | AWS EC2 | Azure Container Instances | Azure App Service |
|---------|---------|--------------------------|-------------------|
| **Monthly Cost** | $5-20 | $35-50 | $10-20 |
| **Setup Time** | 30 min | 15 min | 20 min |
| **SSL** | Let's Encrypt + Nginx | Azure Front Door (free) | Built-in (free) |
| **Student Credits** | None | $100 (great fit) | $100 (best fit) |
| **Auto-scaling** | Manual | Limited | Built-in |
| **Database** | Separate RDS | Separate SQL | Integrated |
| **Learning Curve** | Moderate | Low | Low |

---

## When to Use Each Option

### Use Container Instances If:
- You want **fastest deployment** (15 minutes)
- You're testing/learning
- You need **exact Docker control**
- You have limited time

### Use App Service If:
- You want to **maximize $100 credits** (10+ months)
- You prefer **less configuration**
- You want **built-in SSL**
- You need **auto-scaling**

---

## Troubleshooting

### Container won't start
```bash
# Check logs
az container logs \
  --resource-group TechStackStudio \
  --name techstack-backend

# Check container state
az container show \
  --resource-group TechStackStudio \
  --name techstack-backend \
  --query instanceView.state
```

### Image not found
```bash
# Verify image exists in registry
az acr repository list --name techstackstudio

# Check image credentials
az acr credential show --resource-group TechStackStudio --name techstackstudio
```

### DNS not resolving
```bash
# Wait for DNS propagation (up to 48 hours)
nslookup yourdomain.com

# Check Azure DNS settings
az network dns record-set list \
  --resource-group TechStackStudio \
  --zone-name yourdomain.com
```

### High costs
```bash
# Check resource usage
az container list \
  --resource-group TechStackStudio \
  --output table

# Delete unused resources
az container delete \
  --resource-group TechStackStudio \
  --name old-container
```

---

## Cleanup (Important!)

When done or reaching end of credits:

```bash
# Delete entire resource group (all resources)
az group delete \
  --resource-group TechStackStudio

# Or delete specific resources
az container delete \
  --resource-group TechStackStudio \
  --name techstack-backend

az acr delete \
  --resource-group TechStackStudio \
  --name techstackstudio
```

---

## Next Steps

1. **Sign up for Azure Student**
   - https://azure.microsoft.com/en-us/free/students/
   - Get $100 in credits

2. **Install Azure CLI**
   - https://docs.microsoft.com/cli/azure/install-azure-cli

3. **Choose Your Option**
   - Option A (Container Instances) for speed
   - Option B (App Service) to maximize credits

4. **Follow the Steps**
   - Create Resource Group
   - Build and push Docker images
   - Deploy containers/apps
   - Configure custom domain

5. **Monitor Costs**
   - Use `az billing` commands
   - Stop services when not needed
   - Scale down if costs exceed expectations

---

## Azure Student Benefits

With your student account, you get:
- **$100 in free credits** (12 months)
- **Free tier services** (always free)
- **$200 more after first $100** (if used)
- **Premium support** included

---

## Useful Azure CLI Commands

```bash
# Login
az login

# List all resources
az resource list --resource-group TechStackStudio

# Check costs so far
az billing invoice list

# View spending by service
az consumption aggregated-cost list

# Get resource details
az container show \
  --resource-group TechStackStudio \
  --name techstack-backend

# Stream logs in real-time
az container logs \
  --resource-group TechStackStudio \
  --name techstack-backend \
  --follow

# Execute command in running container
az container exec \
  --resource-group TechStackStudio \
  --name techstack-backend \
  --exec-command /bin/bash
```

---

## Resources

- [Azure Free Student Account](https://azure.microsoft.com/en-us/free/students/)
- [Azure CLI Documentation](https://docs.microsoft.com/cli/azure/)
- [Container Instances Pricing](https://azure.microsoft.com/en-us/pricing/details/container-instances/)
- [App Service Pricing](https://azure.microsoft.com/en-us/pricing/details/app-service/)
- [Azure Front Door Pricing](https://azure.microsoft.com/en-us/pricing/details/frontdoor/)

---

## Support

For issues:
1. Check [Azure troubleshooting](https://docs.microsoft.com/en-us/azure/container-instances/container-instances-troubleshooting)
2. Review Azure CLI error messages
3. Check Azure Portal for resource status
4. Review logs with `az container logs` or `az webapp log tail`

Good luck! 🚀
