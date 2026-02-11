#!/usr/bin/env bash
# Scripts for Visitor Logging

This directory contains utility scripts for monitoring and analyzing visitor logs from your Docker containers.

## Scripts

### 1. monitor-visitor-logs.sh
**Interactive dashboard for viewing visitor logs**

```bash
./scripts/monitor-visitor-logs.sh
```

**Options:**
- `--live` - Real-time log streaming
- `--recent [N]` - Show last N visits (default: 20)
- `--unique-today` - Count unique visitors today
- `--top-agents` - Show most popular user agents
- `--stats` - Overall visitor statistics
- `--filter-ip <IP>` - Filter logs by IP address
- `--export [FILE]` - Export logs to file
- `--nginx` - View nginx access logs

**Examples:**
```bash
# Interactive menu
./scripts/monitor-visitor-logs.sh

# Live monitoring
./scripts/monitor-visitor-logs.sh --live

# Get today's stats
./scripts/monitor-visitor-logs.sh --unique-today

# Filter by IP
./scripts/monitor-visitor-logs.sh --filter-ip 192.168.1.100

# Export for backup
./scripts/monitor-visitor-logs.sh --export visitor_logs_backup.log
```

### 2. analyze-visitor-logs.sh
**Generate reports and analytics from visitor logs**

```bash
./scripts/analyze-visitor-logs.sh [command]
```

**Commands:**
- `summary` - Overall statistics (default)
- `hourly` - Traffic by hour
- `daily` - Traffic by day
- `geo` - IP distribution (requires geo-IP database for full results)
- `export [FILE]` - Export to CSV

**Examples:**
```bash
# Show summary
./scripts/analyze-visitor-logs.sh summary

# Export to CSV
./scripts/analyze-visitor-logs.sh export visitor_analysis.csv

# Hourly breakdown
./scripts/analyze-visitor-logs.sh hourly

# Daily breakdown
./scripts/analyze-visitor-logs.sh daily
```

## Quick Start

### 1. Make scripts executable (already done)
```bash
chmod +x scripts/monitor-visitor-logs.sh
chmod +x scripts/analyze-visitor-logs.sh
```

### 2. View live logs
```bash
./scripts/monitor-visitor-logs.sh --live
```

### 3. Get statistics
```bash
./scripts/analyze-visitor-logs.sh summary
```

### 4. Export data
```bash
./scripts/analyze-visitor-logs.sh export my_data.csv
```

## Output Examples

### Live Logs Output
```
2024-02-11T10:23:45.123456 | visitor_tracker | IP: 203.0.113.42 | Time: 2024-02-11T10:23:45.123456 | Method: GET | Path: / | UserAgent: Mozilla/5.0 (Windows NT 10.0)
2024-02-11T10:23:46.234567 | visitor_tracker | IP: 192.0.2.1 | Time: 2024-02-11T10:23:46.234567 | Method: POST | Path: /api/recommendations | UserAgent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)
```

### Summary Report Output
```
Total Requests: 1547
Unique Visitor IPs: 234
Top 5 Visitor IPs:
  203.0.113.42 (145 visits)
  192.0.2.1 (98 visits)
  198.51.100.5 (67 visits)
  203.0.113.100 (56 visits)
  192.0.2.50 (43 visits)

Most Visited Paths:
  / (345 visits)
  /api/recommendations (234 visits)
  /api/health (123 visits)
  ...

Requests by Method:
  GET: 1234
  POST: 287
  ...
```

### CSV Export
```csv
Timestamp,IP,Method,Path,UserAgent
"2024-02-11T10:23:45.123456","203.0.113.42","GET","/","Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
"2024-02-11T10:23:46.234567","192.0.2.1","POST","/api/recommendations","Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
```

## Common Use Cases

### Monitor a specific IP
```bash
./scripts/monitor-visitor-logs.sh --filter-ip 203.0.113.42
```

### Track traffic during a campaign
```bash
# Start monitoring
./scripts/monitor-visitor-logs.sh --live

# Later, export the data
./scripts/analyze-visitor-logs.sh export campaign_results.csv
```

### Check if your site is getting traffic
```bash
./scripts/analyze-visitor-logs.sh summary
```

### Find top browsers accessing your site
```bash
./scripts/monitor-visitor-logs.sh --top-agents
```

### Backup logs weekly
```bash
./scripts/monitor-visitor-logs.sh --export logs_$(date +%Y%m%d).log
```

## Troubleshooting

### Script not found or permission denied
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run with explicit bash
bash scripts/monitor-visitor-logs.sh
```

### No logs appearing
```bash
# Ensure containers are running
docker compose ps

# Check if logs exist
docker compose exec backend ls -la logs/

# View raw logs
docker compose logs backend | tail -20
```

### Log file not readable
```bash
# Check permissions
ls -la backend/logs/visitor_access.log

# May need to use docker exec to read
docker compose exec backend cat logs/visitor_access.log
```

## Requirements

- Docker and Docker Compose (already installed)
- Standard bash utilities: grep, awk, sed, wc, sort
- Containers must be running with logging enabled

## Log Locations

The scripts read from:
- `backend/logs/visitor_access.log` - Primary log file
- `/var/log/nginx/` - Nginx access logs (via docker exec)
- Docker stdout - Via `docker compose logs`

## Advanced Usage

### Combine with other tools
```bash
# Get last 100 requests, filter by method, count unique IPs
tail -100 backend/logs/visitor_access.log | \
  grep "Method: GET" | \
  awk '{print $3}' | \
  sort -u | wc -l

# Find peak hour
./scripts/analyze-visitor-logs.sh hourly | sort -t: -k2 -rn | head -1
```

### Create custom reports
```bash
# Top visitor IPs with count
grep "IP:" backend/logs/visitor_access.log | \
  awk '{print $3}' | \
  sort | uniq -c | sort -rn | head -10

# Requests per hour today
grep "$(date +%Y-%m-%d)" backend/logs/visitor_access.log | \
  awk -F'Time: ' '{print $2}' | \
  cut -d':' -f1-2 | \
  sort | uniq -c
```

## Schedule with Cron

### Daily backup
```bash
# Add to crontab
0 2 * * * cd /path/to/techstack.io && ./scripts/monitor-visitor-logs.sh --export logs_backup_$(date +\%Y\%m\%d).log
```

### Hourly report
```bash
# Add to crontab
0 * * * * cd /path/to/techstack.io && ./scripts/analyze-visitor-logs.sh summary > logs_hourly_report_$(date +\%Y\%m\%d_\%H).txt
```

## For More Information

See the documentation files:
- [VISITOR_LOGGING_QUICK_START.md](../VISITOR_LOGGING_QUICK_START.md) - Quick reference
- [LOGGING_SETUP.md](../LOGGING_SETUP.md) - Complete setup guide
- [VISITOR_LOGGING_SETUP.md](../VISITOR_LOGGING_SETUP.md) - Configuration details

## Tips & Tricks

1. **Create an alias** for easier access:
   ```bash
   alias monitor-visitors='cd /path/to/techstack.io && ./scripts/monitor-visitor-logs.sh'
   ```

2. **Pipe to less for pagination**:
   ```bash
   ./scripts/monitor-visitor-logs.sh --recent 100 | less
   ```

3. **Watch logs with colors**:
   ```bash
   docker compose logs -f backend | grep --color "IP:"
   ```

4. **Save report to file**:
   ```bash
   ./scripts/analyze-visitor-logs.sh summary > report_$(date +%Y%m%d).txt
   ```

5. **Monitor in tmux/screen**:
   ```bash
   tmux new -s logs -c /path/to/techstack.io -d './scripts/monitor-visitor-logs.sh --live'
   ```

That's it! You're ready to monitor visitor activity. 🎉
