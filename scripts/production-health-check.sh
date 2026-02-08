#!/bin/bash

# AI Query Hub Production Health Check
# Usage: ./scripts/production-health-check.sh
# Description: Comprehensive health check for production environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL="https://aiqueryhub.com"
SUPABASE_URL="https://fskwutnoxbbflzqrphro.supabase.co"
STAGING_URL="https://aiqueryhub-staging.netlify.app"

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Header
echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}           AI Query Hub Production Health Check${NC}"
echo -e "${BLUE}================================================================${NC}"
echo "Date: $(date)"
echo "Environment: Production"
echo ""

# Health check counters
TOTAL_CHECKS=0
FAILED_CHECKS=0

# Frontend Health Check
echo -e "${BLUE}🌐 Frontend Services${NC}"
echo "----------------------------------------"

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if curl -s --max-time 10 "$FRONTEND_URL" >/dev/null 2>&1; then
    print_status 0 "Production Frontend ($FRONTEND_URL)"
else
    print_status 1 "Production Frontend ($FRONTEND_URL)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if curl -s --max-time 10 "$STAGING_URL" >/dev/null 2>&1; then
    print_status 0 "Staging Frontend ($STAGING_URL)"
else
    print_status 1 "Staging Frontend ($STAGING_URL)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# SSL Certificate Check
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
SSL_EXPIRY=$(echo | openssl s_client -servername aiqueryhub.com -connect aiqueryhub.com:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
if [ -n "$SSL_EXPIRY" ]; then
    print_status 0 "SSL Certificate (expires: $SSL_EXPIRY)"
else
    print_status 1 "SSL Certificate Check"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo ""

# Backend API Health Check
echo -e "${BLUE}🔧 Backend Services${NC}"
echo "----------------------------------------"

# AI Query Endpoint
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
AI_RESPONSE=$(curl -s --max-time 15 -X GET "$SUPABASE_URL/functions/v1/ai-query" -H "Authorization: Bearer invalid_token" 2>/dev/null || echo "ERROR")
if [[ "$AI_RESPONSE" == *"Invalid JWT"* ]]; then
    print_status 0 "AI Query Endpoint (auth properly configured)"
else
    print_status 1 "AI Query Endpoint (response: $AI_RESPONSE)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Telegram Webhook
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
TELEGRAM_RESPONSE=$(curl -s --max-time 10 -X POST "$SUPABASE_URL/functions/v1/telegram-webhook" -H "Content-Type: application/json" -d '{"test":"invalid"}' 2>/dev/null || echo "ERROR")
if [[ "$TELEGRAM_RESPONSE" == *"Bot not configured"* ]] || [[ "$TELEGRAM_RESPONSE" == "OK" ]]; then
    print_status 0 "Telegram Webhook"
else
    print_status 1 "Telegram Webhook (response: $TELEGRAM_RESPONSE)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Slack Webhook
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
SLACK_RESPONSE=$(curl -s --max-time 10 -X POST "$SUPABASE_URL/functions/v1/slack-webhook" -H "Content-Type: application/json" -d '{"test":"invalid"}' 2>/dev/null || echo "ERROR")
if [[ "$SLACK_RESPONSE" == "OK" ]] || [[ "$SLACK_RESPONSE" == *"challenge"* ]]; then
    print_status 0 "Slack Webhook"
else
    print_status 1 "Slack Webhook (response: $SLACK_RESPONSE)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Search Memories Function
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
SEARCH_RESPONSE=$(curl -s --max-time 10 -X GET "$SUPABASE_URL/functions/v1/search-memories" -H "Authorization: Bearer invalid_token" 2>/dev/null || echo "ERROR")
if [[ "$SEARCH_RESPONSE" == *"Invalid JWT"* ]] || [[ "$SEARCH_RESPONSE" == *"401"* ]]; then
    print_status 0 "Search Memories Endpoint"
else
    print_status 1 "Search Memories Endpoint (response: $SEARCH_RESPONSE)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Proactive Check-in Function
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
CHECKIN_RESPONSE=$(curl -s --max-time 10 -X GET "$SUPABASE_URL/functions/v1/proactive-checkin" -H "Authorization: Bearer invalid_token" 2>/dev/null || echo "ERROR")
if [[ "$CHECKIN_RESPONSE" == *"Invalid JWT"* ]] || [[ "$CHECKIN_RESPONSE" == *"401"* ]]; then
    print_status 0 "Proactive Check-in Endpoint"
else
    print_status 1 "Proactive Check-in Endpoint (response: $CHECKIN_RESPONSE)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo ""

# Performance Check
echo -e "${BLUE}⚡ Performance Check${NC}"
echo "----------------------------------------"

# Frontend Response Time
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
FRONTEND_TIME=$(curl -w "%{time_total}" -o /dev/null -s --max-time 10 "$FRONTEND_URL" 2>/dev/null || echo "999")
if (( $(echo "$FRONTEND_TIME < 3.0" | bc -l) )); then
    print_status 0 "Frontend Response Time (${FRONTEND_TIME}s)"
else
    print_status 1 "Frontend Response Time (${FRONTEND_TIME}s - >3s threshold)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# API Response Time
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
API_TIME=$(curl -w "%{time_total}" -o /dev/null -s --max-time 15 -X GET "$SUPABASE_URL/functions/v1/ai-query" -H "Authorization: Bearer invalid_token" 2>/dev/null || echo "999")
if (( $(echo "$API_TIME < 2.0" | bc -l) )); then
    print_status 0 "API Response Time (${API_TIME}s)"
else
    print_status 1 "API Response Time (${API_TIME}s - >2s threshold)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo ""

# External Dependencies
echo -e "${BLUE}🌍 External Dependencies${NC}"
echo "----------------------------------------"

# Check external API status pages
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if curl -s --max-time 5 "https://status.anthropic.com" >/dev/null 2>&1; then
    print_status 0 "Anthropic Status Page"
else
    print_warning "Anthropic Status Page (unable to reach)"
fi

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if curl -s --max-time 5 "https://status.supabase.com" >/dev/null 2>&1; then
    print_status 0 "Supabase Status Page"
else
    print_warning "Supabase Status Page (unable to reach)"
fi

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if curl -s --max-time 5 "https://www.netlifystatus.com" >/dev/null 2>&1; then
    print_status 0 "Netlify Status Page"
else
    print_warning "Netlify Status Page (unable to reach)"
fi

echo ""

# Summary
echo -e "${BLUE}📊 Health Check Summary${NC}"
echo "----------------------------------------"
PASSED_CHECKS=$((TOTAL_CHECKS - FAILED_CHECKS))
PASS_RATE=$(( PASSED_CHECKS * 100 / TOTAL_CHECKS ))

echo "Total Checks: $TOTAL_CHECKS"
echo "Passed: $PASSED_CHECKS"
echo "Failed: $FAILED_CHECKS"
echo "Success Rate: ${PASS_RATE}%"

echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}🎉 All systems operational!${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    print_info "Monitor Supabase dashboard: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro"
    print_info "Check logs: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/logs"
    print_info "Review usage: https://supabase.com/dashboard/org/mjskdqkzndioftbffagv/usage"
    exit 0
elif [ $FAILED_CHECKS -le 2 ]; then
    echo -e "${YELLOW}⚠️  Some issues detected, but system mostly operational${NC}"
    echo ""
    echo -e "${BLUE}Recommended Actions:${NC}"
    print_info "Check Supabase logs for errors"
    print_info "Verify external service status"
    print_info "Monitor system for 15 minutes"
    exit 1
else
    echo -e "${RED}🚨 CRITICAL: Multiple system failures detected!${NC}"
    echo ""
    echo -e "${BLUE}Immediate Actions Required:${NC}"
    print_info "Check Supabase project health immediately"
    print_info "Verify external service dependencies"
    print_info "Consider escalating to system administrator"
    print_info "Review recent deployments or changes"
    exit 2
fi