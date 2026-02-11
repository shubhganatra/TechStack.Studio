# Visitor Logging Implementation Summary

## Overview
Comprehensive logging has been added to your Docker containers to track visitor activity including timestamp, IP address, user agent, and request details.

## Files Modified

### 1. **Backend Changes** (`backend/main.py`)
- Added `logging` and `Request` imports
- Created `visitor_logger` with dual output (file + stdout)
- Added `log_visitor_middleware` to FastAPI that logs all HTTP requests
- Captures:
  - Client IP (handles X-Forwarded-For headers from reverse proxies)
  - Timestamp (ISO 8601 format)
  - HTTP method and path
  - User Agent
  - Query parameters
- Logs written to `backend/logs/visitor_access.log`

**Example log entry:**
```
2024-02-11T10:23:45.123456 | visitor_tracker | IP: 203.0.113.42 | Time: 2024-02-11T10:23:45.123456 | Method: GET | Path: /api/recommendations | UserAgent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
```

### 2. **Nginx Configuration** (`nginx/nginx.conf`)
- Added custom `visitor_log` format optimized for tracking
- Format: `IP | Timestamp | Method Path Protocol | Status | UserAgent | X-Forwarded-For | Response Time`
- Logs to both `/var/log/nginx/access.log` and `/var/log/nginx/visitor_access.log`
- Includes ISO 8601 timestamps and proxy header support

### 3. **Docker Compose** (`docker-compose.yml`)
Added proper logging configuration:
- **Logging driver:** JSON file (standard, no external dependencies)
- **Max file size:** 100MB per log file
- **Max files:** 10 rotated files (keeps 1GB historical logs)
- **Volume mounts:** 
  - Backend logs: `./backend/logs:/app/logs`
  - Nginx logs: `nginx-logs` named volume
- Applies to all services: backend, frontend, nginx

## Files Created

### 1. **Monitoring Script** (`scripts/monitor-visitor-logs.sh`)
Interactive dashboard for viewing visitor logs with options:
- `--live` - Real-time visitor logs
- `--recent [N]` - Last N visits (default: 20)
- `--unique-today` - Count unique visitors today
- `--top-agents` - Show popular browsers/clients
- `--stats` - Overall statistics
- `--filter-ip <IP>` - Filter by specific IP
- `--export [FILE]` - Backup logs
- `--nginx` - View nginx logs

Usage:
```bash
./scripts/monitor-visitor-logs.sh --live
./scripts/monitor-visitor-logs.sh --stats
./scripts/monitor-visitor-logs.sh --filter-ip 192.168.1.100
```

### 2. **Analysis Script** (`scripts/analyze-visitor-logs.sh`)
Generate reports from visitor logs:
- `summary` - Overall statistics (default)
- `hourly` - Traffic by hour
- `daily` - Traffic by day
- `geo` - IP distribution
- `export` - Export to CSV

Usage:
```bash
./scripts/analyze-visitor-logs.sh summary
./scripts/analyze-visitor-logs.sh export my_logs.csv
```

### 3. **Documentation**

#### `LOGGING_SETUP.md`
Comprehensive guide covering:
- Log locations (backend, nginx, docker)
- How to view logs (real-time, filtered, archived)
- Docker logging configuration details
- Log rotation policy
- Troubleshooting guide
- Log retention recommendations

#### `VISITOR_LOGGING_QUICK_START.md`
Quick reference for:
- What's being logged
- How to view logs quickly
- Common queries and filters
- Example log formats
- Troubleshooting tips

## How It Works

### Request Flow
```
User Browser
    ↓
Nginx (logs IP, timestamp, user agent)
    ↓
Frontend (Next.js)
    ↓
Backend (FastAPI)
    ↓ (logs via middleware)
visitor_access.log (timestamp, IP, method, path, user agent)
```

### Logging Chain
1. **Nginx** - First capture, includes proxy headers
2. **FastAPI Middleware** - Captures all backend requests
3. **File System** - Logs written to `backend/logs/visitor_access.log`
4. **Docker** - Logs also captured in container stdout

## Getting Started

### 1. Rebuild and run containers
```bash
docker compose down
docker compose up -d
```

### 2. View live logs
```bash
# Real-time monitoring
./scripts/monitor-visitor-logs.sh --live

# Or directly
docker compose logs -f backend | grep "IP:"
```

### 3. Generate reports
```bash
# Show statistics
./scripts/analyze-visitor-logs.sh summary

# Export to CSV
./scripts/analyze-visitor-logs.sh export visitor_data.csv
```

## Log Locations

| Component | Host Location | Container Path |
|-----------|---------------|-----------------|
| Backend Logs | `./backend/logs/visitor_access.log` | `/app/logs/visitor_access.log` |
| Nginx Logs | Via named volume (nginx-logs) | `/var/log/nginx/` |
| Docker Stdout | Via `docker logs` | - |

## Key Features

✅ **IP Tracking** - Real client IP (handles proxies)  
✅ **Timestamp** - ISO 8601 format, precise to milliseconds  
✅ **User Agent** - Browser/client identification  
✅ **Request Details** - Method, path, query parameters  
✅ **Log Rotation** - Automatic cleanup to prevent disk fill  
✅ **Dual Output** - File storage + Docker stdout  
✅ **Easy Querying** - Provided scripts and examples  

## Common Commands

```bash
# Live monitoring
docker compose logs -f backend | grep "IP:"

# Recent visits
tail -50 backend/logs/visitor_access.log

# Count unique visitors today
grep "$(date +%Y-%m-%d)" backend/logs/visitor_access.log | \
  grep "IP:" | awk '{print $3}' | sort -u | wc -l

# Find visits from specific IP
grep "IP: 203.0.113.42" backend/logs/visitor_access.log

# Export logs
./scripts/monitor-visitor-logs.sh --export backup.log

# Get statistics
./scripts/analyze-visitor-logs.sh summary
```

## Next Steps

1. **Test the logging**: Make a request to your app and check `backend/logs/visitor_access.log`
2. **Monitor regularly**: Use `./scripts/monitor-visitor-logs.sh`
3. **Archive logs**: Periodically backup with the export function
4. **Integrate analytics**: Use exported CSVs for further analysis
5. **Set up alerts**: Monitor for suspicious activity or traffic spikes

## Notes

- Logs include nginx, FastAPI middleware, and Docker container logs
- Supports reverse proxy scenarios (X-Forwarded-For headers)
- No external dependencies (uses built-in Docker logging)
- Logs are automatically rotated (100MB max per file, 10 files retained)
- Can be extended to include additional metrics (response times, status codes, etc.)

For detailed documentation, see:
- [LOGGING_SETUP.md](LOGGING_SETUP.md) - Complete setup guide
- [VISITOR_LOGGING_QUICK_START.md](VISITOR_LOGGING_QUICK_START.md) - Quick reference
