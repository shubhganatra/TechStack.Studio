#!/bin/bash

# Visitor Analytics Dashboard
# This script provides various views of visitor logs from Docker containers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored headers
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Function to check if containers are running
check_containers() {
    if ! docker compose ps | grep -q "techstack-backend"; then
        echo -e "${RED}Error: Containers not running. Run 'docker compose up -d'${NC}"
        exit 1
    fi
}

# Function to show real-time visitor logs
show_live_logs() {
    print_header "Live Visitor Access Logs"
    echo -e "${YELLOW}Monitoring real-time visitor access. Press Ctrl+C to stop.${NC}\n"
    docker compose logs -f backend | grep "IP:"
}

# Function to show recent visits
show_recent_visits() {
    local count=${1:-20}
    print_header "Last $count Visitor Accesses"
    
    if [ -f "backend/logs/visitor_access.log" ]; then
        tail -n $count backend/logs/visitor_access.log
    else
        docker compose exec backend tail -n $count logs/visitor_access.log 2>/dev/null || echo "Log file not found"
    fi
}

# Function to show unique visitors today
show_unique_visitors_today() {
    print_header "Unique Visitors Today"
    
    local today=$(date +%Y-%m-%d)
    if [ -f "backend/logs/visitor_access.log" ]; then
        local count=$(grep "$today" backend/logs/visitor_access.log | grep "IP:" | awk '{print $3}' | sort -u | wc -l)
        echo "Total unique IPs: $count"
        echo -e "\n${YELLOW}Breakdown by IP:${NC}"
        grep "$today" backend/logs/visitor_access.log | grep "IP:" | awk '{print $3}' | sort | uniq -c | sort -rn
    else
        echo "Log file not accessible from host. Use: docker compose exec backend cat logs/visitor_access.log"
    fi
}

# Function to show top user agents
show_top_user_agents() {
    print_header "Top 10 User Agents"
    
    if [ -f "backend/logs/visitor_access.log" ]; then
        echo -e "${YELLOW}User Agent Distribution:${NC}"
        grep "UserAgent:" backend/logs/visitor_access.log | sed 's/.*UserAgent: //' | sort | uniq -c | sort -rn | head -10
    else
        echo "Log file not accessible from host. Use: docker compose exec backend cat logs/visitor_access.log"
    fi
}

# Function to show visitor stats
show_visitor_stats() {
    print_header "Visitor Statistics"
    
    if [ -f "backend/logs/visitor_access.log" ]; then
        local total_visits=$(wc -l < backend/logs/visitor_access.log)
        local unique_ips=$(grep "IP:" backend/logs/visitor_access.log | awk '{print $3}' | sort -u | wc -l)
        local today=$(date +%Y-%m-%d)
        local today_visits=$(grep "$today" backend/logs/visitor_access.log | wc -l)
        local today_unique=$(grep "$today" backend/logs/visitor_access.log | grep "IP:" | awk '{print $3}' | sort -u | wc -l)
        
        echo -e "${GREEN}Total Visits (All Time):${NC} $total_visits"
        echo -e "${GREEN}Unique IPs (All Time):${NC} $unique_ips"
        echo -e "${GREEN}Visits Today:${NC} $today_visits"
        echo -e "${GREEN}Unique IPs Today:${NC} $today_unique"
    else
        echo "Log file not accessible from host"
    fi
}

# Function to filter by IP
filter_by_ip() {
    local ip=$1
    if [ -z "$ip" ]; then
        echo "Usage: ./monitor-visitor-logs.sh --filter-ip <IP_ADDRESS>"
        return 1
    fi
    
    print_header "Visits from IP: $ip"
    if [ -f "backend/logs/visitor_access.log" ]; then
        grep "IP: $ip" backend/logs/visitor_access.log
    else
        docker compose exec backend grep "IP: $ip" logs/visitor_access.log 2>/dev/null || echo "IP not found in logs"
    fi
}

# Function to export logs
export_logs() {
    local output_file=${1:-visitor_logs_$(date +%Y%m%d_%H%M%S).log}
    
    print_header "Exporting Logs to $output_file"
    
    if [ -f "backend/logs/visitor_access.log" ]; then
        cp backend/logs/visitor_access.log "$output_file"
        echo -e "${GREEN}Logs exported to: $output_file${NC}"
    else
        docker compose exec backend cat logs/visitor_access.log > "$output_file" 2>/dev/null
        echo -e "${GREEN}Logs exported to: $output_file${NC}"
    fi
}

# Main menu
show_menu() {
    echo ""
    echo -e "${YELLOW}=== Visitor Analytics Dashboard ===${NC}"
    echo "1) View live logs (real-time)"
    echo "2) Show recent 20 visits"
    echo "3) Show unique visitors today"
    echo "4) Show top user agents"
    echo "5) Show visitor statistics"
    echo "6) Filter by IP address"
    echo "7) Export logs"
    echo "8) View nginx access logs"
    echo "0) Exit"
    echo -e "${YELLOW}===================================${NC}"
}

# Main logic
main() {
    check_containers
    
    # If command-line arguments provided
    if [ $# -gt 0 ]; then
        case "$1" in
            --live)
                show_live_logs
                ;;
            --recent)
                show_recent_visits ${2:-20}
                ;;
            --unique-today)
                show_unique_visitors_today
                ;;
            --top-agents)
                show_top_user_agents
                ;;
            --stats)
                show_visitor_stats
                ;;
            --filter-ip)
                filter_by_ip "$2"
                ;;
            --export)
                export_logs "$2"
                ;;
            --nginx)
                print_header "Nginx Access Logs"
                docker compose exec nginx tail -f /var/log/nginx/visitor_access.log
                ;;
            *)
                echo "Unknown option: $1"
                echo ""
                echo "Usage:"
                echo "  $0 --live              - Show live visitor logs"
                echo "  $0 --recent [N]        - Show last N visits (default: 20)"
                echo "  $0 --unique-today      - Show unique visitors today"
                echo "  $0 --top-agents        - Show top user agents"
                echo "  $0 --stats             - Show visitor statistics"
                echo "  $0 --filter-ip <IP>    - Filter visits by IP address"
                echo "  $0 --export [FILE]     - Export logs to file"
                echo "  $0 --nginx             - Show nginx access logs"
                exit 1
                ;;
        esac
    else
        # Interactive menu
        while true; do
            show_menu
            read -p "Select option: " choice
            
            case $choice in
                1) show_live_logs ;;
                2) show_recent_visits ;;
                3) show_unique_visitors_today ;;
                4) show_top_user_agents ;;
                5) show_visitor_stats ;;
                6) 
                    read -p "Enter IP address to filter: " ip
                    filter_by_ip "$ip"
                    ;;
                7)
                    read -p "Enter output filename (default: visitor_logs_TIMESTAMP.log): " filename
                    export_logs "$filename"
                    ;;
                8)
                    print_header "Nginx Access Logs"
                    docker compose logs -f nginx
                    ;;
                0) 
                    echo "Exiting..."
                    exit 0
                    ;;
                *)
                    echo -e "${RED}Invalid option. Please try again.${NC}"
                    ;;
            esac
            
            read -p "Press Enter to continue..."
        done
    fi
}

# Run main function
main "$@"
