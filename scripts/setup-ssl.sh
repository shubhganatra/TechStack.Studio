#!/bin/bash

# TechStack.Studio SSL Setup Script
# This script sets up Let's Encrypt SSL certificate
# Run with: bash scripts/setup-ssl.sh your-domain.com your-email@example.com

set -e

if [ $# -lt 2 ]; then
    echo "Usage: bash scripts/setup-ssl.sh your-domain.com your-email@example.com"
    echo "Example: bash scripts/setup-ssl.sh example.com admin@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=$2

echo "🔒 Setting up SSL Certificate for $DOMAIN"
echo "=========================================="

# Obtain certificate
echo "Obtaining Let's Encrypt certificate..."
sudo certbot certonly \
  --standalone \
  --agree-tos \
  -m $EMAIL \
  -d $DOMAIN \
  -d www.$DOMAIN \
  --non-interactive

# Copy certificates
echo "Copying certificates..."
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/
sudo chown -R $USER:$USER nginx/ssl/
chmod 644 nginx/ssl/*.pem

echo "✓ SSL certificates installed"
echo "Location: nginx/ssl/"
echo ""
echo "Next: Update nginx/conf.d/production.conf with your domain"
echo "Then start containers: docker-compose -f docker-compose.prod.yml up -d"
