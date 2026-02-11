# Quick Reference: Visitor Logging

## What's New

Your Docker containers now have comprehensive logging that captures:
- 🕐 **Timestamp** - When each visitor accessed your site
- 🌐 **IP Address** - Visitor's IP (handles proxies correctly)
- 🔍 **User Agent** - Browser/device information
- 📍 **Path** - What page/endpoint was accessed

## Quick Start

### View Live Visitor Access
```bash
# Live stream of all visits
docker compose logs -f backend | grep "IP:"

# Or use the monitoring script
./scripts/monitor-visitor-logs.sh --live
```

### View Recent Visits
```bash
# Last 50 visits
tail -50 backend/logs/visitor_access.log

# Or use the script
./scripts/monitor-visitor-logs.sh --recent 50
```

### Get Today's Statistics
```bash
./scripts/monitor-visitor-logs.sh --unique-today
./scripts/monitor-visitor-logs.sh --stats
```

### Filter by Visitor IP
```bash
# See all visits from a specific IP
./scripts/monitor-visitor-logs.sh --filter-ip 192.168.1.100

# Or search manually
grep "IP: 192.168.1.100" backend/logs/visitor_access.log
```

## Log File Locations

| Component | Log Location | Container Mount |
|-----------|--------------|-----------------|
| **Backend (FastAPI)** | `./backend/logs/visitor_access.log` | `/app/logs/` |
| **Nginx** | `./docker-volumes/nginx-logs/` | `/var/log/nginx/` |
| **Docker Stdout** | Via `docker compose logs` | - |

## Interactive Monitoring Dashboard

```bash
# Run the interactive dashboard
./scripts/monitor-visitor-logs.sh

# Or run specific commands
./scripts/monitor-visitor-logs.sh --live          # Live logs
./scripts/monitor-visitor-logs.sh --stats         # Statistics
./scripts/monitor-visitor-logs.sh --top-agents    # Popular browsers
./scripts/monitor-visitor-logs.sh --export        # Backup logs
```

## Log Format Examples

### Backend Log Entry
```
2024-02-11T10:23:45.123456 | visitor_tracker | IP: 203.0.113.42 | Time: 2024-02-11T10:23:45.123456 | Method: GET | Path: / | UserAgent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
```

### Nginx Log Entry
```
203.0.113.42 | 2024-02-11T10:23:45+00:00 | GET / HTTP/1.1 | 200 | Mozilla/5.0 (Windows NT 10.0; Win64; x64) | 203.0.113.42 | Time: 1234.56ms
```

## Common Queries

### Count total visits
```bash
wc -l backend/logs/visitor_access.log
```

### Count unique visitors
```bash
grep "IP:" backend/logs/visitor_access.log | awk '{print $3}' | sort -u | wc -l
```

### Find visits from today
```bash
grep "$(date +%Y-%m-%d)" backend/logs/visitor_access.log
```

### Export logs to CSV (for analysis)
```bash
./scripts/monitor-visitor-logs.sh --export my_logs.log
```

### Monitor in real-time (with colors)
```bash
docker compose logs -f --tail=50 backend | grep --color "IP:"
```

## Docker Compose Up
Make sure containers are running with logging enabled:

```bash
docker compose up -d
```

The logging is automatic - no additional configuration needed!

## Troubleshooting

### No logs appearing?
```bash
# Check if containers are running
docker compose ps

# Verify logs are being created
docker compose exec backend ls -la logs/

# Check if backend is receiving requests
docker compose logs backend
```

### Permission denied?
```bash
# Check log file permissions
ls -la backend/logs/

# Fix permissions if needed
sudo chmod 644 backend/logs/visitor_access.log
```

### Clean up old logs?
```bash
# Archive current logs
./scripts/monitor-visitor-logs.sh --export logs_backup_$(date +%Y%m%d).log

# Clear logs (optional)
# docker compose exec backend sh -c 'rm logs/visitor_access.log && touch logs/visitor_access.log'
```

## Next Steps

1. **Start logging**: Run `docker compose up -d`
2. **Monitor**: Use `./scripts/monitor-visitor-logs.sh` 
3. **Analyze**: Check `backend/logs/visitor_access.log` periodically
4. **Archive**: Backup logs regularly using the export command

For detailed documentation, see [LOGGING_SETUP.md](LOGGING_SETUP.md)
