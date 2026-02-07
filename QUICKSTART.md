# Quick Start Guide for Local Development

This guide helps you run the entire application locally with Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- A [Groq API Key](https://console.groq.com/)

## Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/TechStack.Studio.git
cd TechStack.Studio
```

### 2. Create Environment File
```bash
cp .env.example .env
```

Edit `.env` and add your Groq API key:
```env
GROQ_API_KEY=your_groq_api_key_here
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Start Docker Compose
```bash
# Development environment (with hot reload)
docker-compose up -d

# OR Production-like environment (recommended for testing)
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Wait for Services to Be Healthy
```bash
# Check status
docker-compose ps

# Watch logs
docker-compose logs -f
```

Wait for all containers to show "healthy" status.

### 5. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## Common Commands

### Stop Everything
```bash
docker-compose down
```

### View Logs
```bash
# All containers
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx
```

### Rebuild Containers
```bash
docker-compose down
docker-compose up -d --build
```

### Clean Everything
```bash
# Remove containers, volumes, and networks
docker-compose down -v
```

---

## Troubleshooting

### Backend API not responding
```bash
# Check backend logs
docker-compose logs backend

# Verify API is running
curl http://localhost:8000/

# Check environment variable
docker-compose exec backend printenv GROQ_API_KEY
```

### Frontend not loading
```bash
# Check frontend logs
docker-compose logs frontend

# Verify frontend is running
curl http://localhost:3000/
```

### Port already in use
```bash
# Find what's using the port
lsof -i :3000  # Frontend
lsof -i :8000  # Backend
lsof -i :80    # Nginx

# Kill the process if needed
kill -9 <PID>
```

### CORS errors in browser console
- Ensure `NEXT_PUBLIC_API_URL` matches your backend URL
- Check that frontend can reach backend at the configured URL
- Backend should have CORS enabled (it does by default)

---

## Development Workflow

### Making Changes

**Backend Changes (FastAPI):**
1. Edit `backend/main.py`
2. Container should auto-reload if using development compose
3. If not, run: `docker-compose restart backend`

**Frontend Changes (Next.js):**
1. Edit files in `frontend/`
2. Next.js dev server will hot-reload automatically
3. Open http://localhost:3000 and your changes should appear

### Testing API Endpoints

Use the FastAPI Swagger UI:
1. Open http://localhost:8000/docs
2. Try out endpoints like:
   - `POST /api/generate-prompt`
   - `POST /api/recommend`

---

## Docker Compose Services

### Backend
- **Image**: Python 3.11 with FastAPI
- **Port**: 8000 (exposed), 0.0.0.0:8000 (host)
- **Health Check**: Tests GET / endpoint every 30s
- **Volumes**: `./backend/logs:/app/logs`

### Frontend
- **Image**: Node.js 20 with Next.js
- **Port**: 3000 (exposed), 0.0.0.0:3000 (host)
- **Health Check**: Tests HTTP request every 30s
- **Environment**: `NEXT_PUBLIC_API_URL` for API endpoint

### Nginx
- **Image**: nginx:alpine
- **Ports**: 80 (HTTP), 443 (HTTPS - not active in dev)
- **Routes**:
  - `/` → Frontend (localhost:3000)
  - `/api/` → Backend (localhost:8000)

---

## Next Steps

When ready to deploy to AWS:
1. Follow [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Set up EC2 instance
3. Configure domain and SSL
4. Deploy with `docker-compose.prod.yml`

Good luck! 🚀
