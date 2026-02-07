# TechStack.Studio Deployment Guide

## Overview
This guide walks you through deploying TechStack.Studio on AWS EC2 with Docker, Nginx, and SSL/TLS support.

### Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Your Domain                          │
│              (example.com, www.example.com)             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   Nginx (Reverse Proxy)                 │
│           Port 80 (HTTP) & Port 443 (HTTPS)            │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌────────┐    ┌────────┐    ┌──────────┐
   │Frontend│    │Backend │    │ Let's    │
   │        │    │        │    │Encrypt   │
   │Next.js │    │FastAPI │    │(SSL)     │
   └────────┘    └────────┘    └──────────┘
   Port 3000    Port 8000
```

---

## Prerequisites

1. **AWS Account** - Create one at https://aws.amazon.com
2. **Domain Name** - You should already have one
3. **SSH Key Pair** - For EC2 access
4. **Git** - For cloning the repository
5. **Docker & Docker Compose** - We'll install these on EC2

---

## Step 1: Launch EC2 Instance

### 1.1 Navigate to AWS EC2
- Go to AWS Management Console
- Click **EC2** in the services menu
- Click **Launch Instance**

### 1.2 Configure Instance
- **AMI**: Select **Ubuntu Server 24.04 LTS** (free tier eligible)
- **Instance Type**: `t3.micro` or `t3.small` (micro is free tier, small is recommended)
- **Key Pair**: Select or create a new SSH key pair
  - **Save the .pem file securely** - you'll need it to access the server
- **Network Settings**:
  - Allow SSH (port 22)
  - Allow HTTP (port 80)
  - Allow HTTPS (port 443)
  - Source: 0.0.0.0/0 (or restrict to your IP for security)
- **Storage**: 30 GB (default is fine, can increase if needed)
- **Launch Instance**

### 1.3 Get Your Server Details
Once launched, note:
- **Public IP Address** (e.g., 52.14.123.45)
- **Elastic IP** (recommended: assign a static Elastic IP to avoid IP changes)

---

## Step 2: Connect to EC2 Instance

```bash
# Change permissions on your key file (macOS/Linux)
chmod 400 your-key.pem

# SSH into the instance
ssh -i your-key.pem ubuntu@your-public-ip
# Example: ssh -i techstack-key.pem ubuntu@52.14.123.45
```

---

## Step 3: Install Docker & Docker Compose

Once connected to your EC2 instance, run:

```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add ubuntu user to docker group (so we don't need sudo for docker)
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Log out and back in for group changes to take effect
exit
# SSH back in
ssh -i your-key.pem ubuntu@your-public-ip
```

---

## Step 4: Clone Your Repository

```bash
# Clone your GitHub repository (or your Git provider)
git clone https://github.com/yourusername/TechStack.Studio.git
cd TechStack.Studio

# If private, use SSH key or create a personal access token
```

---

## Step 5: Configure Environment Variables

```bash
# Copy the example env file
cp .env.example .env

# Edit the .env file with your settings
nano .env
```

**Update these values:**

```env
# Backend Configuration
GROQ_API_KEY=your_actual_groq_api_key_here

# Frontend Configuration
NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# Deployment Configuration
DOMAIN=yourdomain.com
EMAIL=your-email@example.com
ENVIRONMENT=production

# SSL/TLS
USE_SSL=true
```

Save and exit (Ctrl+X, then Y, then Enter in nano).

---

## Step 6: Configure Nginx for Your Domain

Edit the production nginx configuration:

```bash
nano nginx/conf.d/production.conf
```

Replace `yourdomain.com` and `www.yourdomain.com` with your actual domain:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;  # <-- UPDATE THIS
    ...
}
```

Also update the SSL certificate paths to match your domain. Save the file.

---

## Step 7: Set Up DNS Records

Point your domain to your EC2 instance's **Elastic IP**.

**For most domain registrars:**

1. Go to your domain registrar (GoDaddy, Namecheap, Route53, etc.)
2. Find DNS Management or Settings
3. Create/Update these A records:
   - **Host**: `@` or `yourdomain.com` → **Points to**: Your EC2 Public IP
   - **Host**: `www` → **Points to**: Your EC2 Public IP

**If using AWS Route53:**
1. Go to AWS → Route 53
2. Create a Hosted Zone for your domain
3. Create two A records:
   - Name: `yourdomain.com`, Type: A, Value: Your EC2 Public IP
   - Name: `www.yourdomain.com`, Type: A, Value: Your EC2 Public IP
4. Update your domain registrar's nameservers to Route53's nameservers

⏳ **Wait 5-30 minutes** for DNS to propagate (use `nslookup yourdomain.com` to check).

---

## Step 8: Obtain SSL Certificate with Let's Encrypt

We'll use **Certbot** to automatically obtain and install an SSL certificate.

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# First, ensure your domain DNS is pointing to this server
# Then obtain the certificate (standalone mode for Docker)
sudo certbot certonly \
  --standalone \
  --agree-tos \
  -m your-email@example.com \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --non-interactive

# Verify the certificate was created
sudo ls -la /etc/letsencrypt/live/yourdomain.com/
```

You should see:
- `fullchain.pem` - The SSL certificate
- `privkey.pem` - The private key

---

## Step 9: Update Docker Compose for Production

```bash
# Make sure you're in your project directory
cd ~/TechStack.Studio

# Create the SSL directory for nginx
mkdir -p nginx/ssl

# Copy Let's Encrypt certificates to our nginx ssl directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Set permissions
sudo chown -R $USER:$USER nginx/ssl/
chmod 644 nginx/ssl/*.pem
```

---

## Step 10: Start Docker Containers

```bash
# Navigate to project directory
cd ~/TechStack.Studio

# Build and start containers with production compose file
docker-compose -f docker-compose.prod.yml up -d

# Verify containers are running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

**Expected output:**
```
CONTAINER ID   IMAGE                    COMMAND                  STATUS
abc123...      techstack_backend        "uvicorn main:app..."    Up (healthy)
def456...      techstack_frontend       "npm start"              Up (healthy)
ghi789...      nginx:alpine             "nginx -g daemon of..."  Up
```

---

## Step 11: Verify Your Deployment

1. **Open your browser** and visit:
   - https://yourdomain.com
   - https://www.yourdomain.com

2. **Check SSL Certificate** (should show green lock):
   - Click the lock icon → View Certificate
   - Issuer should be "Let's Encrypt"
   - Should be valid for 90 days

3. **Test API Connectivity**:
   - Open browser console (F12)
   - Check Network tab for API requests to `/api/` endpoints
   - Should return 200 or 500 status (not CORS errors)

4. **Check Container Logs**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs backend
   docker-compose -f docker-compose.prod.yml logs frontend
   ```

---

## Step 12: Set Up Auto-Renewal for SSL Certificate

Let's Encrypt certificates expire after 90 days. Set up automatic renewal:

```bash
# Edit the root crontab
sudo crontab -e

# Add this line (renews daily at 3 AM UTC)
0 3 * * * certbot renew --quiet && sudo cp /etc/letsencrypt/live/yourdomain.com/*.pem /home/ubuntu/TechStack.Studio/nginx/ssl/ && cd /home/ubuntu/TechStack.Studio && docker-compose -f docker-compose.prod.yml restart nginx
```

---

## Step 13: Maintenance & Monitoring

### View Live Logs
```bash
# Backend logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Frontend logs
docker-compose -f docker-compose.prod.yml logs -f frontend

# Nginx logs
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### Restart Services
```bash
# Restart a specific service
docker-compose -f docker-compose.prod.yml restart backend

# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Full restart (stop and start)
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Update Your Application
```bash
# Pull latest code
git pull origin main

# Rebuild containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Check health
docker-compose -f docker-compose.prod.yml ps
```

### Monitor System Resources
```bash
# View real-time container stats
docker stats

# View disk usage
df -h

# View memory usage
free -h
```

---

## Step 14: Security Best Practices

### 1. Update Security Groups
In AWS Console → EC2 → Security Groups:
- **SSH (22)**: Restrict to your IP only
- **HTTP (80)**: Allow 0.0.0.0/0 (for Let's Encrypt renewal)
- **HTTPS (443)**: Allow 0.0.0.0/0

### 2. Enable SSH Key-Only Access
```bash
# Disable password authentication
sudo nano /etc/ssh/sshd_config

# Change these lines:
# PasswordAuthentication no
# PubkeyAuthentication yes
# PermitRootLogin no

# Restart SSH
sudo systemctl restart ssh
```

### 3. Set Up Firewall
```bash
# Enable UFW (uncomplicated firewall)
sudo ufw enable
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw status
```

### 4. Regular Updates
```bash
# Schedule automatic updates
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Troubleshooting

### SSL Certificate Issues
```bash
# Check certificate details
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal

# Test renewal
sudo certbot renew --dry-run
```

### Container Won't Start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Rebuild from scratch
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

### Port Already in Use
```bash
# Find process using port 80/443
sudo lsof -i :80
sudo lsof -i :443

# Kill if needed
sudo kill -9 <PID>
```

### DNS Not Working
```bash
# Test DNS resolution
nslookup yourdomain.com
dig yourdomain.com

# Check if ports are open
curl http://yourdomain.com
curl https://yourdomain.com
```

---

## Expected Cost (AWS Free Tier)

- **EC2 t3.micro**: Free (750 hours/month)
- **Elastic IP**: Free (if actively used)
- **Data Transfer**: ~1 GB free/month
- **SSL Certificates**: Free (Let's Encrypt)

**Total: ~$0/month with free tier**

If you exceed free tier or need more power:
- **t3.small**: ~$6-10/month
- **t3.medium**: ~$25-30/month

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [AWS EC2 User Guide](https://docs.aws.amazon.com/ec2/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Next.js Production Deployment](https://nextjs.org/docs/deployment)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)

---

## Support

For issues, check:
1. Container logs: `docker-compose logs`
2. System logs: `journalctl -xe`
3. AWS Security Groups and Network ACLs
4. DNS propagation: `nslookup yourdomain.com`

Good luck! 🚀
