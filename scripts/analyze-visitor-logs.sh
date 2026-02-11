#!/bin/bash

# Visitor Log Analysis Tool
# Generates reports from visitor logs

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

LOG_FILE="backend/logs/visitor_access.log"

print_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════╗"
    echo "║ $1"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"
}

if [ ! -f "$LOG_FILE" ]; then
    echo "Log file not found: $LOG_FILE"
    echo "Make sure containers are running and have processed some requests."
    exit 1
fi

# Parse command
case "${1:-summary}" in
    summary)
        print_header "VISITOR SUMMARY REPORT"
        
        echo -e "${GREEN}Total Requests:${NC}"
        wc -l < "$LOG_FILE"
        
        echo -e "\n${GREEN}Unique Visitor IPs:${NC}"
        grep "IP:" "$LOG_FILE" | awk '{print $3}' | sort -u | wc -l
        
        echo -e "\n${GREEN}Top 5 Visitor IPs:${NC}"
        grep "IP:" "$LOG_FILE" | awk '{print $3}' | sort | uniq -c | sort -rn | head -5 | awk '{print "  " $2 " (" $1 " visits)"}'
        
        echo -e "\n${GREEN}Most Visited Paths:${NC}"
        grep "Path:" "$LOG_FILE" | sed 's/.*Path: //' | awk '{print $1}' | sort | uniq -c | sort -rn | head -5 | awk '{print "  " $2 " (" $1 " visits)"}'
        
        echo -e "\n${GREEN}Requests by Method:${NC}"
        grep "Method:" "$LOG_FILE" | awk '{print $7}' | sort | uniq -c | awk '{print "  " $2 ": " $1}'
        
        echo -e "\n${GREEN}Top 5 User Agents:${NC}"
        grep "UserAgent:" "$LOG_FILE" | sed 's/.*UserAgent: //' | sort | uniq -c | sort -rn | head -5 | awk '{gsub(/UserAgent: /, ""); print "  " substr($2 " " substr($0, index($0,$3)), 1, 60) " (" $1 ")"}'
        ;;
        
    hourly)
        print_header "HOURLY TRAFFIC REPORT"
        
        echo -e "${GREEN}Requests per Hour (Last 24 hours):${NC}"
        grep "$(date -d '1 day ago' '+%Y-%m-%d')" "$LOG_FILE" 2>/dev/null | \
            sed 's/.*Time: //' | \
            cut -d'T' -f2 | \
            cut -d':' -f1 | \
            sort | uniq -c | \
            awk '{printf "  %02d:00 - %02d:59: %s requests\n", $2, $2, $1}'
        ;;
        
    daily)
        print_header "DAILY TRAFFIC REPORT"
        
        echo -e "${GREEN}Requests per Day:${NC}"
        grep "Time:" "$LOG_FILE" | \
            sed 's/.*Time: //' | \
            cut -d'T' -f1 | \
            sort | uniq -c | \
            awk '{print "  " $2 ": " $1 " requests"}'
        ;;
        
    geo)
        print_header "GEOGRAPHIC ANALYSIS (by IP)"
        
        echo -e "${YELLOW}Note: This requires local geo-IP database. Showing IP summary instead.${NC}\n"
        
        echo -e "${GREEN}IP Distribution:${NC}"
        grep "IP:" "$LOG_FILE" | awk '{print $3}' | sort | uniq -c | sort -rn | head -20 | \
            awk '{printf "  %-15s %4d requests\n", $2, $1}'
        ;;
        
    export)
        output="${2:-visitor_report_$(date +%Y%m%d_%H%M%S).csv}"
        
        print_header "EXPORTING LOGS"
        
        echo "Timestamp,IP,Method,Path,UserAgent" > "$output"
        
        grep "IP:" "$LOG_FILE" | awk -F'|' '{
            # Extract fields
            ip = $3; gsub(/^ +IP: | +$/, "", ip)
            time = $4; gsub(/^ +Time: | +$/, "", time)
            method = $5; gsub(/^ +Method: | +$/, "", method)
            path = $6; gsub(/^ +Path: | +$/, "", path)
            ua = $7; gsub(/^ +UserAgent: | +$/, "", ua)
            
            # Write CSV
            printf "\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n", time, ip, method, path, ua
        }' >> "$output"
        
        echo -e "${GREEN}Exported to: $output${NC}"
        echo "Rows: $(wc -l < "$output")"
        ;;
        
    *)
        echo "Visitor Log Analysis Tool"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  summary           - Display summary statistics (default)"
        echo "  hourly            - Show requests per hour (last 24h)"
        echo "  daily             - Show requests per day"
        echo "  geo               - Show geographic distribution by IP"
        echo "  export [FILE]     - Export logs as CSV"
        echo ""
        echo "Example:"
        echo "  $0 summary"
        echo "  $0 export my_logs.csv"
        ;;
esac
