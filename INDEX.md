[![AWS EC2 Docker Deployment](https://img.shields.io/badge/AWS%20EC2-Deployment%20Ready-orange?style=flat-square&logo=amazon-aws)](./DEPLOYMENT.md)
[![Docker Compose](https://img.shields.io/badge/Docker%20Compose-Configured-blue?style=flat-square&logo=docker)](./docker-compose.yml)
[![Let's Encrypt SSL](https://img.shields.io/badge/SSL-Let's%20Encrypt-red?style=flat-square)](./DEPLOYMENT.md#step-8-obtain-ssl-certificate-with-lets-encrypt)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](./LICENSE)

# TechStack.Studio - Docker & AWS Deployment Configuration

Complete Docker containerization and AWS EC2 deployment setup for TechStack.Studio - an AI-powered tech stack recommendation platform.

## 🎯 What's Included

This deployment setup includes everything needed to run TechStack.Studio in production on AWS EC2:

- ✅ **Docker Containerization** - Separate containers for frontend, backend, and Nginx
- ✅ **Docker Compose** - Development and production configurations
- ✅ **Nginx Reverse Proxy** - Load balancing and SSL/TLS termination
- ✅ **Let's Encrypt SSL** - Automatic HTTPS with free certificates
- ✅ **Environment Configuration** - Development and production templates
- ✅ **Automated Scripts** - EC2 setup, SSL configuration, health checks
- ✅ **Comprehensive Documentation** - Step-by-step guides for all scenarios
- ✅ **Security Hardening** - Firewalls, security headers, rate limiting

## 📂 Complete File Structure

```
TechStack.Studio/
│
├── 📖 DOCUMENTATION
│   ├── DEPLOYMENT.md              ← START HERE for AWS EC2 setup
│   ├── DOCKER_DEPLOYMENT.md       ← Overview & quick reference
│   ├── QUICKSTART.md              ← Local development with Docker
│   ├── ENV_CONFIG.md              ← Environment variable guide
│   └── TROUBLESHOOTING.md         ← Common issues & solutions
│
├── 🐳 DOCKER CONFIGURATION
│   ├── docker-compose.yml         ← Development environment
│   ├── docker-compose.prod.yml    ← Production environment
│   ├── .dockerignore              ← Docker build optimization
│   ├── backend/Dockerfile         ← Python FastAPI image
│   └── frontend/Dockerfile        ← Node.js Next.js image
│
├── 🔧 NGINX REVERSE PROXY
│   └── nginx/
│       ├── nginx.conf             ← Main Nginx configuration
│       ├── conf.d/
│       │   ├── default.conf       ← Development HTTP config
│       │   └── production.conf    ← Production HTTPS config
│       └── ssl/                   ← SSL certificates (auto-generated)
│
├── ⚙️ ENVIRONMENT & CONFIG
│   ├── .env.example               ← Template for environment variables
│   └── backend/requirements.txt    ← Python dependencies
│
├── 🛠️ AUTOMATION SCRIPTS
│   └── scripts/
│       ├── setup-ec2.sh           ← Automated EC2 environment setup
│       ├── setup-ssl.sh           ← Let's Encrypt certificate setup
│       ├── health-check.sh        ← Service health monitoring
│       └── deploy.sh              ← Automated redeployment
│
└── 📦 APPLICATION CODE
    ├── backend/
    │   ├── main.py               ← FastAPI server
    │   └── logs/                 ← Application logs
    └── frontend/
        ├── app/                  ← Next.js pages
        ├── components/           ← React components
        ├── lib/                  ← Utilities & helpers
        └── public/               ← Static assets
```

## 🚀 Quick Start Guide
### Option 0: Have $100 Azure Student Credits? Start Here!
```bash
# Azure offers $100 free credits for students
# DURATION: 6-10 months on App Service (vs 2-3 months on Container Instances)

# 1. Sign up for Azure Student
# https://azure.microsoft.com/en-us/free/students/

# 2. Follow Azure deployment (simplest & longest duration)
# Read: AZURE_DEPLOYMENT.md → Option B: App Service

# Duration: 20 minutes setup
# Cost: FREE for 6-10 months!
```

**Compare cloud options first:** Read [AWS_vs_AZURE.md](./AWS_vs_AZURE.md)
### Option 1: Local Development (5 minutes)

```bash
# 1. Clone and setup
cd TechStack.Studio
cp .env.example .env

# 2. Add your Groq API key
echo "GROQ_API_KEY=sk-your-key" >> .env

# 3. Start with Docker Compose
docker-compose up -d

# 4. Access application
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

See [QUICKSTART.md](./QUICKSTART.md) for details.

### Option 2: AWS EC2 Production (30 minutes)

```bash
# 1. Launch EC2 instance
# → AWS Console → EC2 → Launch Instance
# → Ubuntu 24.04 LTS, t3.micro (free tier)

# 2. SSH into instance
ssh -i your-key.pem ubuntu@your-public-ip

# 3. Run automated setup
git clone https://github.com/yourusername/TechStack.Studio.git
cd TechStack.Studio
bash scripts/setup-ec2.sh

# 4. Configure for your domain
cp .env.example .env
nano .env  # Update DOMAIN, EMAIL, GROQ_API_KEY

# 5. Obtain SSL certificate
bash scripts/setup-ssl.sh yourdomain.com your-email@example.com

# 6. Deploy
docker-compose -f docker-compose.prod.yml up -d

# 7. Verify
bash scripts/health-check.sh
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete step-by-step instructions.

## 📚 Documentation Map

| Document | Purpose | Audience |
|----------|---------|----------|
| [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) | Overview & complete reference | Everyone |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 14-step AWS EC2 deployment guide | DevOps/Deployment |
| [QUICKSTART.md](./QUICKSTART.md) | Local Docker development setup | Developers |
| [ENV_CONFIG.md](./ENV_CONFIG.md) | Environment variable configuration | Everyone |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues & solutions | Everyone |

## 🏗️ Architecture

```
                        Your Domain
                     (yourdomain.com)
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            SSL Certificate        Security Group
            (Let's Encrypt)        (Port 80/443)
                    │                   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼──────────┐
                    │   AWS EC2 Instance │
                    │   (Ubuntu 24.04)   │
                    └─────────┬──────────┘
                              │
                ┌─────────────┴─────────────┐
                │    Nginx Reverse Proxy    │
                │   Port 80 & 443 (SSL)    │
                └─────────────┬─────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
          ┌──────────────┐          ┌──────────────┐
          │   Frontend   │          │   Backend    │
          │   Next.js    │          │   FastAPI    │
          │  Port 3000   │          │  Port 8000   │
          │              │          │              │
          │ - React UI   │          │ - LLM APIs   │
          │ - Mermaid    │          │ - Groq       │
          │ - PDF Export │          │ - LangChain  │
          └──────────────┘          └──────────────┘
                │                           │
                └─────────────┬─────────────┘
                              │
                        Docker Network
```

## 🔑 Key Features

### Docker Setup
- ✅ Multi-stage builds for optimized image sizes (production: ~200MB)
- ✅ Health checks for all services (automatic restarts)
- ✅ Volume mounting for logs, code, and SSL certificates
- ✅ Network isolation between services
- ✅ Environment variable management
- ✅ Development and production configurations

### Nginx Reverse Proxy
- ✅ HTTP/HTTPS routing to frontend and backend
- ✅ SSL/TLS termination with Let's Encrypt
- ✅ Automatic HTTP → HTTPS redirect
- ✅ Gzip compression for faster loading
- ✅ Security headers (HSTS, CSP, X-Frame-Options)
- ✅ Rate limiting to prevent abuse
- ✅ Supports multiple domains and subdomains

### AWS EC2 Deployment
- ✅ Free tier eligible (t3.micro)
- ✅ Automated setup with Docker
- ✅ Static Elastic IP for consistent access
- ✅ Security groups with port restrictions
- ✅ SSH key-based authentication
- ✅ Auto-renewal of SSL certificates

### Security
- ✅ End-to-end HTTPS encryption
- ✅ Free SSL certificates via Let's Encrypt
- ✅ Security headers for XSS/clickjacking protection
- ✅ Rate limiting (10 req/s, burst 20)
- ✅ Firewall configuration (UFW)
- ✅ SSH key-only authentication
- ✅ Automatic security updates

## 💰 Expected Costs Comparison

### Azure (with $100 Student Credits) 🎓 **BEST FOR STUDENTS**
| Service | Monthly | Student Duration |
|---------|---------|------------------|
| **Option A: Container Instances** | $35-45 | 2-3 months |
| **Option B: App Service** ✅ | $10 | 10 months |
| SSL Certificates | $0 | Forever |
| **Total** | **$10-45/month** | **6-10 months FREE** |

### AWS (Free Tier)
| Service | Duration | Cost |
|---------|----------|------|
| EC2 (t3.micro) | 12 months | $0 |
| Elastic IP | Always | $0 |
| Data Transfer | Monthly | $0 |
| SSL Certificates | Always | $0 |
| **After Free Tier** | | **$5-10/month** |

**Recommendation:** Azure App Service gets you 10 months FREE! ✅

## 📋 Deployment Checklist

### Before Deploying
- [ ] Read [AWS_vs_AZURE.md](./AWS_vs_AZURE.md) to choose platform
- [ ] **If using Azure:** Check if you have $100 student credits
  - [ ] Sign up: https://azure.microsoft.com/en-us/free/students/
  - [ ] Read [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md)
- [ ] **If using AWS:** 
  - [ ] Have AWS account (free tier eligible)
  - [ ] Read [DEPLOYMENT.md](./DEPLOYMENT.md)
- [ ] Have domain name
- [ ] Have Groq API key from https://console.groq.com

### During Deployment
- [ ] Launch EC2 instance (Ubuntu 24.04 LTS)
- [ ] Run `bash scripts/setup-ec2.sh`
- [ ] Configure `.env` file
- [ ] Point domain DNS to EC2 Elastic IP
- [ ] Obtain SSL certificate via `bash scripts/setup-ssl.sh`
- [ ] Update Nginx config with domain name
- [ ] Deploy: `docker-compose -f docker-compose.prod.yml up -d`

### After Deployment
- [ ] Verify HTTPS works: `curl https://yourdomain.com`
- [ ] Check SSL certificate: Visit site, click lock icon
- [ ] Test API: Visit http://yourdomain.com/docs
- [ ] Monitor health: `bash scripts/health-check.sh`
- [ ] Set up auto-renewal cron job
- [ ] Review security logs

## 🔧 Common Commands

### Development
```bash
docker-compose up -d              # Start all services
docker-compose logs -f            # View live logs
docker-compose down               # Stop all services
docker-compose ps                 # Check status
docker-compose exec backend bash  # SSH into backend
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d     # Start
docker-compose -f docker-compose.prod.yml logs -f   # Logs
docker-compose -f docker-compose.prod.yml down      # Stop
bash scripts/health-check.sh                         # Health check
bash scripts/deploy.sh                               # Update & redeploy
```

### Maintenance
```bash
docker stats                      # Resource usage
docker image prune -a             # Clean up images
docker volume prune               # Clean up volumes
docker-compose restart backend    # Restart service
```

## 🐛 Troubleshooting

Common issues and quick fixes:

| Issue | Solution |
|-------|----------|
| Can't SSH into EC2 | Check key permissions: `chmod 400 key.pem` |
| DNS not resolving | Wait 5-30 minutes, check A record points to Elastic IP |
| Containers won't start | Run `docker-compose logs` to see error |
| API returns 502 Bad Gateway | Check backend is running: `curl localhost:8000` |
| SSL certificate error | Ensure domain DNS is configured before obtaining certificate |
| Can't reach frontend | Check Nginx is running: `docker-compose logs nginx` |

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed solutions.

## 📞 Support Resources

- **AWS Support**: https://aws.amazon.com/support/
- **Docker Documentation**: https://docs.docker.com/
- **Let's Encrypt**: https://letsencrypt.org/docs/
- **Nginx**: https://nginx.org/en/docs/
- **FastAPI**: https://fastapi.tiangolo.com/
- **Next.js**: https://nextjs.org/docs/

## 🔄 Update & Maintenance

### Update Application Code
```bash
git pull origin main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

### Renew SSL Certificate
```bash
# Manual renewal
sudo certbot renew --force-renewal

# Auto-renewal via cron (already set in setup)
# Runs daily at 3 AM UTC
```

### Monitor Application
```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check health
bash scripts/health-check.sh

# View system resource usage
docker stats
```

## 📊 Performance Monitoring

### Check Container Health
```bash
docker-compose ps
# STATUS should show: Up (healthy)
```

### Monitor Resources
```bash
docker stats
# Shows: CPU %, Memory usage, Network I/O
```

### Review Logs for Errors
```bash
docker-compose logs backend | grep ERROR
docker-compose logs frontend | grep ERROR
docker-compose logs nginx | grep ERROR
```

## 🎓 Learning Resources

### Docker
- [Docker Getting Started](https://www.docker.com/get-started)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices for Writing Dockerfiles](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)

### AWS
- [AWS EC2 User Guide](https://docs.aws.amazon.com/ec2/)
- [AWS Free Tier Eligibility](https://aws.amazon.com/free/)
- [EC2 Instance Types](https://aws.amazon.com/ec2/instance-types/)

### DevOps
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [SSL/TLS Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)

## 📝 Additional Files Generated

| File | Purpose |
|------|---------|
| `backend/requirements.txt` | Python dependencies |
| `.env.example` | Environment variable template |
| `.dockerignore` | Docker build optimization |
| `nginx/ssl/` | SSL certificate storage |
| `scripts/` | Automation shell scripts |

## 🤝 Contributing

To improve this deployment setup:

1. Test the scripts locally
2. Document any issues found
3. Submit improvements via pull request
4. Share feedback in issues

## 📄 License

This deployment configuration is part of TechStack.Studio and follows the same license as the main project.

---

## 🎯 Next Steps

1. **Start here**: Read [DEPLOYMENT.md](./DEPLOYMENT.md) for complete AWS setup
2. **Quick testing**: Follow [QUICKSTART.md](./QUICKSTART.md) to run locally
3. **Environment setup**: Check [ENV_CONFIG.md](./ENV_CONFIG.md) for variables
4. **Issues?**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for solutions

Good luck with your deployment! 🚀

---

**Last Updated**: February 2026  
**Docker Version**: 26.0+  
**Node Version**: 20 LTS  
**Python Version**: 3.11  
**Ubuntu Version**: 24.04 LTS
