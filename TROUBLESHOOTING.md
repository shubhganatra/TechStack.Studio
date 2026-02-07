# AWS Deployment Troubleshooting Guide

Common issues and solutions when deploying TechStack.Studio on AWS EC2.

## Connection Issues

### Problem: Can't SSH into EC2 instance
```bash
ssh -i your-key.pem ubuntu@your-public-ip
# Error: Permission denied (publickey)
```

**Solutions:**
```bash
# 1. Check file permissions (must be 400)
chmod 400 your-key.pem

# 2. Use correct username (ubuntu for Ubuntu AMI)
ssh -i your-key.pem ubuntu@your-ip

# 3. Check security group allows SSH (port 22)
# AWS Console → EC2 → Security Groups → Inbound Rules

# 4. Verify public IP is correct
# AWS Console → EC2 → Instances → Check Public IPv4 Address
```

### Problem: DNS not resolving
```bash
curl https://yourdomain.com
# curl: (6) Could not resolve host
```

**Solutions:**
```bash
# 1. Check DNS propagation
nslookup yourdomain.com
dig yourdomain.com +short

# 2. Verify DNS records point to EC2 IP
# Domain Registrar → DNS Settings → A Record should point to your Elastic IP

# 3. Wait 5-30 minutes for propagation (can take longer)

# 4. If using Route53, check nameservers are set in registrar

# 5. Flush DNS cache (macOS)
sudo dscacheutil -flushcache
```

## Docker Issues

### Problem: Docker containers won't start
```bash
docker-compose -f docker-compose.prod.yml up -d
# Error: Container exited with code 1
```

**Solutions:**
```bash
# 1. Check logs
docker-compose -f docker-compose.prod.yml logs

# 2. Check specific service
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend

# 3. Rebuild containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Check disk space
df -h  # Should show at least 10GB free

# 5. Check memory
free -h  # Should have at least 512MB available
```

### Problem: "Connection refused" when accessing localhost
```bash
curl http://localhost:3000
# Connection refused
```

**Solutions:**
```bash
# 1. Check if containers are running
docker-compose ps

# 2. Check container logs
docker-compose logs frontend

# 3. Check if service is actually listening
docker exec techstack-frontend netstat -tlnp | grep 3000

# 4. Try accessing from inside container
docker exec techstack-frontend wget http://localhost:3000

# 5. Check firewall
sudo ufw status  # If using UFW
```

### Problem: Out of disk space
```bash
docker-compose up -d
# No space left on device
```

**Solutions:**
```bash
# 1. Check disk usage
df -h

# 2. Clean up Docker
docker system prune -a  # WARNING: Removes all unused images
docker volume prune      # Remove unused volumes

# 3. Check log files
du -sh /var/lib/docker/  # Docker storage
du -sh logs/             # Application logs

# 4. Expand EBS volume (AWS)
# AWS Console → EC2 → Volumes → Select volume → Modify volume
```

## API & Connectivity Issues

### Problem: Frontend can't reach backend API
Browser console shows CORS errors:
```
Access to XMLHttpRequest at 'http://backend:8000/api/...' 
blocked by CORS policy
```

**Solutions:**
```bash
# 1. Check backend URL in frontend env
cat .env | grep NEXT_PUBLIC_API_URL

# 2. For local Docker: should be http://localhost:8000
# For production: should be https://yourdomain.com/api

# 3. Verify backend is running
curl http://localhost:8000

# 4. Check Nginx routing
docker-compose logs nginx

# 5. Update CORS in backend/main.py if needed
nano backend/main.py
# Find CORSMiddleware and update allow_origins
```

### Problem: API returns 502 Bad Gateway
```
Error 502 Bad Gateway
```

**Solutions:**
```bash
# 1. Check backend is running
docker-compose ps

# 2. Check backend logs
docker-compose logs -f backend

# 3. Verify Groq API key is set
docker-compose exec backend printenv GROQ_API_KEY

# 4. Check backend health
curl http://localhost:8000

# 5. Check Nginx is properly routing to backend
docker-compose logs nginx

# 6. Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Problem: API returns 401 Unauthorized
```
{"detail": "Unauthorized"}
```

**Solutions:**
```bash
# 1. Check Groq API key
cat .env | grep GROQ_API_KEY

# 2. Verify it's correct at https://console.groq.com/keys

# 3. Check backend logs
docker-compose logs backend

# 4. Check rate limits at console.groq.com

# 5. Restart backend with new key
docker-compose restart backend
```

## SSL/TLS Issues

### Problem: SSL certificate not found
```bash
docker-compose -f docker-compose.prod.yml up -d
# Error: /etc/letsencrypt/.../fullchain.pem not found
```

**Solutions:**
```bash
# 1. Obtain certificate
sudo certbot certonly \
  --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com

# 2. Copy to nginx directory
sudo cp /etc/letsencrypt/live/yourdomain.com/*.pem nginx/ssl/
sudo chown -R $USER:$USER nginx/ssl/

# 3. Verify files exist
ls -la nginx/ssl/

# 4. Rebuild containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Problem: SSL certificate expired
```
Error: SSL certificate expired
```

**Solutions:**
```bash
# 1. Check certificate status
sudo certbot certificates

# 2. Renew manually
sudo certbot renew --force-renewal

# 3. Update cron job for auto-renewal
sudo crontab -e
# Add: 0 3 * * * certbot renew --quiet && sudo systemctl restart docker

# 4. Restart Nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

### Problem: "ERR_SSL_PROTOCOL_ERROR"
```
Your connection is not secure
```

**Solutions:**
```bash
# 1. Check certificate paths in nginx config
grep -n "ssl_certificate" nginx/conf.d/production.conf

# 2. Verify files exist
ls -la /etc/letsencrypt/live/yourdomain.com/

# 3. Check file permissions
ls -la nginx/ssl/

# 4. Test SSL
openssl s_client -connect yourdomain.com:443

# 5. Restart Nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

## Performance Issues

### Problem: Website is slow
```bash
# Check response times
time curl https://yourdomain.com
```

**Solutions:**
```bash
# 1. Check server resource usage
docker stats

# 2. Check for memory leaks
docker-compose logs backend | grep -i memory

# 3. Check Nginx compression
curl -H "Accept-Encoding: gzip" -I https://yourdomain.com

# 4. Optimize Next.js build
docker-compose -f docker-compose.prod.yml logs frontend | grep build

# 5. Consider upgrading instance type
# AWS Console → EC2 → Instances → Instance Type
# Note: Requires stopping instance first
```

### Problem: High CPU usage
```bash
docker stats
# CPU usage at 100%
```

**Solutions:**
```bash
# 1. Identify which service
docker stats  # Watch which service shows high %

# 2. Check logs for errors
docker-compose logs SERVICE_NAME

# 3. Restart the service
docker-compose restart SERVICE_NAME

# 4. If persistent, upgrade instance
# AWS Console → Stop Instance → Change Instance Type → Start

# 5. Check for infinite loops in code
grep -r "while True" backend/
```

## Port Issues

### Problem: Port already in use
```bash
Error: bind: address already in use :::80
```

**Solutions:**
```bash
# 1. Find process using port
lsof -i :80
lsof -i :443
lsof -i :3000
lsof -i :8000

# 2. Kill the process (if safe)
kill -9 <PID>

# 3. Or restart Docker
docker-compose down
docker-compose up -d

# 4. Check what's listening
netstat -tlnp | grep LISTEN
```

## Security Issues

### Problem: Website accessible via HTTP without redirect
```bash
curl -L http://yourdomain.com
# Should show HTTPS redirect
```

**Solutions:**
```bash
# 1. Check Nginx config
grep -A5 "server_name" nginx/conf.d/production.conf

# 2. Verify redirect rule exists
grep "return 301" nginx/conf.d/production.conf

# 3. Test redirect
curl -L -v http://yourdomain.com

# 4. Restart Nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

## Logging & Debugging

### View All Logs
```bash
# Docker Compose logs
docker-compose -f docker-compose.prod.yml logs -f

# System logs
journalctl -xe

# Nginx access logs
docker-compose exec nginx tail -f /var/log/nginx/access.log

# Nginx error logs
docker-compose exec nginx tail -f /var/log/nginx/error.log

# Application logs
ls -la logs/
```

### Debug Mode
```bash
# Increase log verbosity
export DEBUG=*
docker-compose up -d

# Check environment variables
docker-compose exec backend printenv
docker-compose exec frontend printenv
```

## Emergency Procedures

### Full System Restart
```bash
# Stop everything
docker-compose -f docker-compose.prod.yml down

# Wait 30 seconds
sleep 30

# Start fresh
docker-compose -f docker-compose.prod.yml up -d

# Monitor startup
docker-compose logs -f
```

### Rollback to Previous Version
```bash
# Stop current version
docker-compose -f docker-compose.prod.yml down

# Checkout previous git version
git log --oneline
git checkout <previous-commit-hash>

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

### Free Up Space Immediately
```bash
# Remove old Docker images
docker image prune -a --force

# Remove unused volumes
docker volume prune --force

# Remove Docker build cache
docker builder prune --force -a

# Check space reclaimed
df -h
```

## Contact Support

If you still have issues:

1. Check the main [DEPLOYMENT.md](DEPLOYMENT.md)
2. Review [QUICKSTART.md](QUICKSTART.md)
3. Check [ENV_CONFIG.md](ENV_CONFIG.md)
4. Review Docker/Nginx logs
5. Check AWS EC2 console for instance health
6. Verify security groups allow traffic
7. Test with simpler commands (e.g., `curl http://localhost:8000`)

## Useful Debugging Commands

```bash
# Check container health
docker-compose ps

# Get detailed container info
docker inspect techstack-backend

# Test backend API
curl http://localhost:8000
curl -X POST http://localhost:8000/api/generate-prompt

# Test frontend
curl http://localhost:3000

# Check network
docker network ls
docker network inspect techstack-network

# View container environment
docker-compose exec backend env
docker-compose exec frontend env

# SSH into container
docker-compose exec backend bash
docker-compose exec frontend bash

# Check file permissions
ls -la nginx/ssl/
ls -la .env
```
