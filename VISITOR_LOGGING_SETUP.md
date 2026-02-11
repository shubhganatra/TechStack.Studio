# Setup Instructions for Visitor Logging

## Prerequisites

Your logging system is already integrated. No additional installation needed!

## Quick Setup

### 1. Verify Files Are in Place

```bash
# Check backend logging
ls -la backend/logs/ 2>/dev/null || echo "Logs directory will be created on first run"

# Check scripts
ls -la scripts/monitor-visitor-logs.sh
ls -la scripts/analyze-visitor-logs.sh

# Check documentation
ls -la LOGGING_SETUP.md
ls -la VISITOR_LOGGING_QUICK_START.md
ls -la VISITOR_LOGGING_IMPLEMENTATION.md
```

### 2. Ensure Docker Containers Are Running

```bash
# Start containers with logging enabled
docker compose down
docker compose up -d

# Verify containers are healthy
docker compose ps
```

### 3. Test Logging is Working

```bash
# Make a test request to your application
curl http://localhost:3000/

# Check logs are being created
docker compose logs backend | tail -5

# View the log file directly
tail backend/logs/visitor_access.log
```

## Configuration

### Default Configuration

The logging system is pre-configured with:

**Backend Logging** (`backend/main.py`):
- Format: ISO 8601 timestamps
- Output: File (`backend/logs/visitor_access.log`) + stdout
- Level: INFO (logs all requests)

**Nginx Logging** (`nginx/nginx.conf`):
- Format: IP | Timestamp | Method Path | Status | UserAgent
- Output: Multiple formats for different analysis
- Files: `access.log` (standard) and `visitor_access.log` (custom)

**Docker Logging** (`docker-compose.yml`):
- Driver: json-file
- Max size: 100MB per file
- Max files: 10 (keeps 1GB total)
- Auto-rotation: Enabled

### Customizing Log Format

To change what's logged in the backend, edit `backend/main.py`:

```python
# Current format in log_visitor_middleware
log_message = f"IP: {client_ip} | Time: {timestamp} | Method: {method} | Path: {path} | UserAgent: {user_agent}"

# You can add more fields like:
log_message = f"IP: {client_ip} | Time: {timestamp} | Method: {method} | Path: {path} | UserAgent: {user_agent} | Referer: {referer}"
```

## Monitoring Setup

### Option 1: Use Interactive Dashboard

```bash
# Start the monitoring dashboard
./scripts/monitor-visitor-logs.sh

# Or run commands directly
./scripts/monitor-visitor-logs.sh --live
./scripts/monitor-visitor-logs.sh --stats
```

### Option 2: Manual Docker Commands

```bash
# Watch logs in real-time
docker compose logs -f backend

# Filter for visitor logs
docker compose logs -f backend | grep "IP:"

# Watch specific service
docker compose logs -f nginx
```

### Option 3: File System Monitoring

```bash
# Watch file changes (requires `watch` command)
watch 'tail -20 backend/logs/visitor_access.log'

# Or use `tail` with follow
tail -f backend/logs/visitor_access.log
```

## Running Analysis

```bash
# Show summary statistics
./scripts/analyze-visitor-logs.sh summary

# Show hourly breakdown
./scripts/analyze-visitor-logs.sh hourly

# Export to CSV
./scripts/analyze-visitor-logs.sh export my_analysis.csv
```

## Log Retention Policy

Logs are automatically rotated by Docker:

```
Max file size: 100MB
Rotation: Automatic
Max files kept: 10
Total capacity: ~1GB per service
```

### Manual Cleanup

```bash
# View current log sizes
du -sh backend/logs/

# Archive logs
./scripts/monitor-visitor-logs.sh --export archived_logs_$(date +%Y%m%d).log

# Clear logs (optional - careful with this!)
# docker compose exec backend rm logs/visitor_access.log
# docker compose exec backend touch logs/visitor_access.log
```

## Troubleshooting

### Problem: "Log file not found"

**Solution:**
```bash
# Ensure containers are running
docker compose up -d

# Check if backend container is healthy
docker compose ps | grep backend

# Check logs are being created
docker compose exec backend ls -la logs/
```

### Problem: "Permission denied" when viewing logs

**Solution:**
```bash
# Check file permissions
ls -la backend/logs/visitor_access.log

# Fix permissions if needed
chmod 644 backend/logs/visitor_access.log

# Or run commands with proper permissions
docker compose exec backend cat logs/visitor_access.log
```

### Problem: "No logs appearing in real-time"

**Solution:**
```bash
# Ensure PYTHONUNBUFFERED is set
docker compose logs backend | grep PYTHONUNBUFFERED

# If not set, update docker-compose.yml and restart
docker compose down
docker compose up -d
```

### Problem: High disk usage from logs

**Solution:**
```bash
# Check log file sizes
du -sh backend/logs/
docker system df

# Archive and clear old logs
./scripts/monitor-visitor-logs.sh --export old_logs_$(date +%Y%m%d).log

# Clean up old rotated files
docker system prune -a
```

## Advanced Configuration

### Add Custom Logging Fields

Edit `backend/main.py` in the `log_visitor_middleware` function:

```python
# Current fields:
client_ip = request.headers.get("X-Forwarded-For", ...)
user_agent = request.headers.get("User-Agent", ...)
method = request.method
path = request.url.path
query_params = request.url.query

# Add new fields:
referer = request.headers.get("Referer", "unknown")
content_length = request.headers.get("Content-Length", "0")
accept_language = request.headers.get("Accept-Language", "unknown")

# Include in log:
log_message = f"IP: {client_ip} | Time: {timestamp} | Method: {method} | Path: {path} | UA: {user_agent} | Referer: {referer} | Lang: {accept_language}"
```

### Integrate with External Logging Service

For production, consider integrating with:

1. **AWS CloudWatch**
   ```python
   import watchtower
   logging.getLogger().addHandler(
       watchtower.CloudWatchLogHandler()
   )
   ```

2. **Datadog**
   ```python
   from ddtrace import tracer
   tracer.wrap()(log_visitor_middleware)
   ```

3. **Splunk**
   ```python
   import logging_splunk
   logging.getLogger().addHandler(
       logging_splunk.SplunkHandler()
   )
   ```

### Enable Request/Response Body Logging

```python
# In log_visitor_middleware, add after status_code
if method in ["POST", "PUT"]:
    try:
        body = await request.body()
        log_message += f" | Body Size: {len(body)}"
    except:
        pass
```

## Performance Considerations

- **Logging overhead:** Minimal (async middleware, non-blocking)
- **Disk I/O:** Buffered writes, ~1-2KB per request
- **Log file growth:** ~100KB per 50,000 requests
- **Rotation:** Automatic at 100MB (configurable in docker-compose.yml)

## Security Notes

⚠️ **Be careful with sensitive data:**
- User agents may contain version information
- Query parameters might contain tokens or IDs
- Consider filtering sensitive data before logging

Example filtering:
```python
# Remove sensitive parameters from logs
if "password" in query_params or "token" in query_params:
    query_params = "[REDACTED]"
```

## Next Steps

1. ✅ **Setup** - Run `docker compose up -d`
2. ✅ **Test** - Make a request and check logs
3. ✅ **Monitor** - Use `./scripts/monitor-visitor-logs.sh`
4. ✅ **Analyze** - Use `./scripts/analyze-visitor-logs.sh`
5. ✅ **Archive** - Backup logs regularly
6. 🔄 **Integrate** - Connect to your analytics platform

## Support

For issues or questions:
1. Check [LOGGING_SETUP.md](LOGGING_SETUP.md) for detailed documentation
2. Review [VISITOR_LOGGING_QUICK_START.md](VISITOR_LOGGING_QUICK_START.md) for common operations
3. Check Docker logs: `docker compose logs`
4. Verify file permissions and ownership

## Quick Reference

```bash
# Most common commands
docker compose logs -f backend                    # Live logs
tail -f backend/logs/visitor_access.log          # File monitoring
./scripts/monitor-visitor-logs.sh --stats        # Get statistics
./scripts/analyze-visitor-logs.sh summary        # Generate report
./scripts/monitor-visitor-logs.sh --export file  # Backup logs
grep "IP: 203.0.113.42" backend/logs/visitor_access.log  # Filter by IP
```

Everything is ready to use! Start your containers and begin monitoring visitor activity.
