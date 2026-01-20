#!/bin/bash
# Test script for agent-translate-local debug function
#
# Prerequisites:
# 1. Start local supabase functions in another terminal:
#    npx supabase functions serve agent-translate-local --env-file .env.local
#
# 2. Set your user JWT token below (get from browser dev tools > Application > supabase.auth.token)
#
# Usage:
#    ./scripts/test-agent-local.sh
#    ./scripts/test-agent-local.sh "Your custom input here"

set -e

# Configuration
LOCAL_FUNCTION_URL="http://localhost:54321/functions/v1/agent-translate-local"

# Check if TOKEN is set
if [ -z "$TOKEN" ]; then
    echo "ERROR: TOKEN environment variable is not set"
    echo ""
    echo "To get your token:"
    echo "1. Open your app in the browser and log in"
    echo "2. Open Developer Tools (F12)"
    echo "3. Go to Application > Local Storage > your site"
    echo "4. Find 'sb-fskwutnoxbbflzqrphro-auth-token' (or similar)"
    echo "5. Copy the 'access_token' value from the JSON"
    echo ""
    echo "Then run:"
    echo "  export TOKEN='your_token_here'"
    echo "  ./scripts/test-agent-local.sh"
    exit 1
fi

# Default input or use first argument
INPUT="${1:-Book me an appointment tomorrow at 2pm with Sarah to discuss the Q1 report}"

echo "=== Testing agent-translate-local ==="
echo "URL: $LOCAL_FUNCTION_URL"
echo "Input: $INPUT"
echo ""

# Get user's timezone (macOS/Linux compatible)
TIMEZONE=$(date +%Z 2>/dev/null || echo "UTC")
# Try to get IANA timezone if possible (more reliable than abbreviation)
if command -v python3 &> /dev/null; then
  IANA_TZ=$(python3 -c "import datetime; print(datetime.datetime.now().astimezone().tzinfo)" 2>/dev/null || echo "")
  if [ -n "$IANA_TZ" ] && [ "$IANA_TZ" != "None" ]; then
    TIMEZONE=$IANA_TZ
  fi
fi

# Make the request with timezone context (PAM pattern)
echo "=== Making Request ==="
echo "Timezone: $TIMEZONE"
echo ""
RESPONSE=$(curl -s -w "\n\nHTTP_STATUS:%{http_code}" \
  -X POST "$LOCAL_FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"unstructured_input\": \"$INPUT\", \"context\": {\"timezone\": \"$TIMEZONE\"}}")

# Extract body and status
BODY=$(echo "$RESPONSE" | sed -n '1,/HTTP_STATUS:/p' | sed 's/HTTP_STATUS:.*//')
STATUS=$(echo "$RESPONSE" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d':' -f2)

echo "HTTP Status: $STATUS"
echo ""
echo "=== Response Body ==="
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

# Check success
if [ "$STATUS" = "200" ]; then
    echo "=== SUCCESS ==="
    echo "The function is working correctly!"
else
    echo "=== FAILURE ==="
    echo "Check the function logs for details."
    echo ""
    echo "If running locally, logs appear in the terminal running:"
    echo "  npx supabase functions serve agent-translate-local --env-file .env.local"
fi
