# Environment Configuration Guide

This file explains how to configure environment variables for different environments.

## Development Environment

**File**: `.env.local`

```env
# Backend API URL (local development)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Groq API Key
GROQ_API_KEY=sk-your-groq-key-here
```

## Production Environment (AWS EC2)

**File**: `.env` (or `.env.production`)

```env
# Backend API URL (production)
NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# Groq API Key
GROQ_API_KEY=sk-your-groq-key-here

# Application Environment
NODE_ENV=production
```

## Docker Environment Variables

### Backend Container (.env)
```env
GROQ_API_KEY=sk-your-groq-key-here
PYTHONUNBUFFERED=1
```

### Frontend Container (docker-compose)
```yaml
environment:
  - NEXT_PUBLIC_API_URL=http://backend:8000  # Internal Docker network
  # OR for production:
  - NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

### Nginx Configuration
The Nginx reverse proxy routes all traffic:
- `/` → Frontend (port 3000)
- `/api/` → Backend (port 8000)

So frontend API calls to `https://yourdomain.com/api/` are automatically routed to the backend.

## Environment Variable Reference

| Variable | Example | Required | Notes |
|----------|---------|----------|-------|
| `GROQ_API_KEY` | `sk-...` | Yes | Get from https://console.groq.com/ |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Yes | Public API endpoint for frontend |
| `NODE_ENV` | `production` | No | Next.js environment (defaults to `development`) |
| `DOMAIN` | `yourdomain.com` | Yes (prod) | Your domain name |
| `EMAIL` | `admin@example.com` | Yes (prod) | For SSL certificate notifications |
| `USE_SSL` | `true` | No | Enable SSL/TLS |

## How the Frontend Communicates with Backend

### Development (Docker Compose)
```
Browser → http://localhost:3000
           ↓
         Next.js Frontend
           ↓
         NEXT_PUBLIC_API_URL=http://localhost:8000
           ↓
         http://localhost:8000/api/...
           ↓
         FastAPI Backend
```

### Production (AWS EC2)
```
Browser → https://yourdomain.com
           ↓
         Nginx (reverse proxy)
           ↓
         /     → http://frontend:3000
         /api/ → http://backend:8000
           ↓
         Frontend makes API calls to:
         NEXT_PUBLIC_API_URL=https://yourdomain.com/api
           ↓
         https://yourdomain.com/api/... → Nginx routes to backend
           ↓
         FastAPI Backend
```

## Important Notes

1. **NEXT_PUBLIC_ prefix**: Any variable with this prefix is exposed to the browser. Safe for URLs, NOT for secrets.

2. **Backend secrets**: Never expose API keys like GROQ_API_KEY to the frontend. Keep them in backend `.env` only.

3. **Docker network**: Inside Docker containers, services can communicate by hostname (e.g., `http://backend:8000`). This is different from localhost.

4. **CORS**: The backend has CORS enabled to allow frontend requests. Update CORS origins for production:
   - Development: `allow_origins=["*"]`
   - Production: Change to `allow_origins=["https://yourdomain.com"]`

## Quick Setup Steps

### Local Development
```bash
# Copy example
cp .env.example .env

# Add your Groq API key
echo "GROQ_API_KEY=sk-your-key" >> .env

# Start Docker Compose
docker-compose up -d
```

### Production Deployment
```bash
# On EC2, update .env with:
GROQ_API_KEY=sk-your-key
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
DOMAIN=yourdomain.com
EMAIL=your-email@example.com
```

## Troubleshooting

### Frontend can't reach backend?
1. Check `NEXT_PUBLIC_API_URL` is correct
2. Verify Nginx is running: `docker-compose logs nginx`
3. Check backend health: `curl http://localhost:8000`
4. Check CORS errors in browser console

### Groq API key not working?
1. Get key from: https://console.groq.com/keys
2. Ensure key is in backend `.env` (not frontend!)
3. Check backend logs: `docker-compose logs backend`

### API returns 401 or 403?
1. Verify Groq API key is valid
2. Check rate limits at https://console.groq.com/
3. Review backend logs for error details

## Backend CORS Configuration

To update CORS for production (in `backend/main.py`):

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://yourdomain.com",
        "https://www.yourdomain.com",
        "http://localhost:3000"  # Keep for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Then rebuild: `docker-compose -f docker-compose.prod.yml up -d --build`
