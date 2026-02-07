#!/bin/bash

# TechStack.Studio AWS Deployment Setup Script
# This script automates much of the AWS EC2 setup process
# Run with: bash scripts/setup-ec2.sh

set -e  # Exit on error

echo "🚀 TechStack.Studio AWS EC2 Setup Script"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if running on EC2
if ! grep -q "ec2" /sys/hypervisor/uuid; then
    print_warning "This doesn't appear to be an AWS EC2 instance. Proceed anyway? (y/n)"
    read -r response
    if [[ ! $response =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

print_status "Starting EC2 setup..."

# Update system
print_status "Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y
print_status "System packages updated"

# Install Docker
print_status "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh
sudo usermod -aG docker ubuntu
print_status "Docker installed"

# Install Docker Compose
print_status "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
print_status "Docker Compose installed"

# Install Certbot for SSL
print_status "Installing Certbot..."
sudo apt-get install -y certbot python3-certbot-nginx
print_status "Certbot installed"

# Create necessary directories
print_status "Creating directories..."
mkdir -p nginx/ssl
print_status "Directories created"

# Verify installation
print_status "Verifying installations..."
docker --version
docker-compose --version
certbot --version
print_status "All installations verified"

print_status "EC2 setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure .env file with your settings"
echo "2. Update nginx configuration with your domain"
echo "3. Point your domain DNS to this server's IP"
echo "4. Obtain SSL certificate: bash scripts/setup-ssl.sh"
echo "5. Start services: docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "For full instructions, see DEPLOYMENT.md"
