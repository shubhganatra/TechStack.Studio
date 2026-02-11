# Docker Logging Configuration

This document describes the comprehensive logging setup for tracking visits to your application.

## Overview

The logging system captures the following information for each visitor:
- **IP Address** - Client's IP address (handles X-Forwarded-For headers from reverse proxies)
- **Timestamp** - ISO 8601 formatted time of visit
- **User Agent** - Browser/client information
- **HTTP Method & Path** - What endpoint was accessed
- **Query Parameters** - Any additional query strings

## Log Locations

### 1. Nginx Access Logs (Reverse Proxy)
**Path in container:** `/var/log/nginx/`
**Host mount:** `./docker-volumes/nginx-logs/` (volumes defined in docker-compose)

**Files:**
- `access.log` - Standard combined format
- `visitor_access.log` - Custom format optimized for visitor tracking

**Format:** `IP | Timestamp | Method Path Protocol | Status | UserAgent | X-Forwarded-For | Response Time`

### 2. Backend Visitor Logs (FastAPI)
**Path in container:** `/app/logs/`
**Host mount:** `./backend/logs/`

**File:** `visitor_access.log`

**Format:** `ISO Timestamp | IP | Method | Path | UserAgent | Query Params`

**Example:**
```
2024-02-11T10:23:45.123456 | visitor_tracker | IP: 192.168.1.100 | Time: 2024-02-11T10:23:45.123456 | Method: GET | Path: / | UserAgent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) | Query: 
2024-02-11T10:23:46.234567 | visitor_tracker | IP: 192.168.1.100 | Time: 2024-02-11T10:23:46.234567 | Method: POST | Path: /api/recommendations | UserAgent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) | Query: 
```

### 3. Frontend Logs (Next.js)
**Access via Docker:** `docker logs techstack-frontend`

### 4. Docker Container Logs
**View all logs:** 
```bash
docker compose logs -f
```

**View specific service:**
```bash
docker compose logs -f backend     # Backend logs
docker compose logs -f frontend    # Frontend logs
docker compose logs -f nginx       # Nginx logs
```

## Viewing Logs in Real-Time

### Monitor all container logs:
```bash
docker compose logs -f
```

### Monitor visitor access to backend:
```bash
docker compose logs -f backend | grep "IP:"
```

### Monitor nginx requests:
```bash
docker compose exec nginx tail -f /var/log/nginx/visitor_access.log
```

### View backend logs on host:
```bash
tail -f backend/logs/visitor_access.log
```

## Docker Logging Configuration

The `docker-compose.yml` is configured with:
- **Driver:** `json-file` (standard JSON file logging)
- **Max Size:** 100MB per log file
- **Max Files:** 10 rotated files
- **Labels:** Service labels for identification

This prevents logs from consuming unlimited disk space while maintaining 1GB of historical logs per service.

## Log Rotation

Logs are automatically rotated by Docker when they reach 100MB. Each service keeps up to 10 rotated files.

**Manual cleanup:**
```bash
# Clean up old logs
docker system prune --volumes

# Remove all logs for a specific container
docker exec techstack-nginx rm /var/log/nginx/*.log
```

## Monitoring Visitor Activity

### Count unique IPs today:
```bash
docker compose exec backend cat logs/visitor_access.log | grep "$(date +%Y-%m-%d)" | grep "IP:" | awk '{print $3}' | sort -u | wc -l
```

### View most recent 50 visits:
```bash
tail -50 backend/logs/visitor_access.log
```

### Filter by specific IP:
```bash
docker compose exec backend grep "IP: 192.168.1.100" logs/visitor_access.log
```

### Extract all user agents:
```bash
docker compose exec backend cat logs/visitor_access.log | grep "UserAgent:" | sed 's/.*UserAgent: //' | sort | uniq -c | sort -rn
```

## Log Retention Policy

- **Backend logs:** Stored in `./backend/logs/` - configure retention as needed
- **Nginx logs:** Managed by Docker with 10 rotated files of 100MB each
- **Container logs:** Managed by Docker with 10 rotated files of 100MB each

For production, consider:
1. Archiving logs to AWS S3 or similar storage
2. Using centralized logging (ELK Stack, Splunk, CloudWatch)
3. Setting up alerts for specific patterns

## Troubleshooting

### Logs not appearing
1. Ensure `PYTHONUNBUFFERED=1` is set in backend environment
2. Check container is running: `docker compose ps`
3. Verify volume mounts: `docker inspect techstack-backend | grep -A 5 Mounts`

### Permission denied when reading logs
```bash
# Check permissions
ls -la backend/logs/
docker compose exec backend ls -la logs/

# May need to change permissions
sudo chmod 644 backend/logs/visitor_access.log
```

### Container not creating logs
```bash
# Check container status
docker compose logs backend

# Restart the service
docker compose restart backend
```
