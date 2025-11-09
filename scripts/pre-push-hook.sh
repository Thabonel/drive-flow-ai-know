#!/bin/bash

# Pre-push hook to prevent pushing secrets to GitHub
# This hook scans staged files for common secret patterns

echo "🔍 Scanning for secrets before push..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Secret patterns to check for (pattern_name|pattern)
PATTERNS=(
    "Supabase Service Role Key|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSI.*service_role"
    "Supabase Anon Key|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSI.*\.anon"
    "AWS Access Key|AKIA[0-9A-Z]{16}"
    "Stripe Secret Key|sk_(test|live)_[0-9a-zA-Z]{24,}"
    "Stripe Restricted Key|rk_(test|live)_[0-9a-zA-Z]{24,}"
    "OpenAI API Key|sk-[a-zA-Z0-9]{48}"
    "Anthropic API Key|sk-ant-[a-zA-Z0-9\-]{95,}"
    "Generic API Key|(api[_-]?key|apikey)['\"]?\s*[:=]\s*['\"][a-zA-Z0-9_\-]{20,}['\"]"
    "Bearer Token|[Bb]earer\s+[a-zA-Z0-9\-\._~\+\/]{20,}"
    "Private Key|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----"
    "Database URL with Password|(postgres|mysql|mongodb):\/\/[^:]+:[^@]+@"
    "JWT Token|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"
    "Environment Secret|( SECRET|PASSWORD|TOKEN|KEY)=['\"]?[a-zA-Z0-9_\-]{20,}['\"]?"
)

# Files to always exclude from secret scanning
EXCLUDE_PATTERNS=(
    "package-lock.json"
    "yarn.lock"
    "pnpm-lock.yaml"
    ".git/"
    "node_modules/"
    "*.min.js"
    "*.min.css"
    "*.map"
    ".next/"
    "dist/"
    "build/"
)

# Get list of files to be pushed
FILES_TO_PUSH=$(git diff --name-only --cached)

if [ -z "$FILES_TO_PUSH" ]; then
    # No staged files, check all modified files
    FILES_TO_PUSH=$(git diff --name-only HEAD)
fi

if [ -z "$FILES_TO_PUSH" ]; then
    echo -e "${GREEN}✓${NC} No files to scan"
    exit 0
fi

SECRETS_FOUND=0
WARNINGS_FOUND=0

# Function to check if file should be excluded
should_exclude() {
    local file=$1
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        if [[ $file == $pattern ]]; then
            return 0
        fi
    done
    return 1
}

# Scan each file
while IFS= read -r file; do
    # Skip if file doesn't exist (deleted files)
    [ ! -f "$file" ] && continue

    # Skip excluded files
    if should_exclude "$file"; then
        continue
    fi

    # Check each pattern
    for pattern_entry in "${PATTERNS[@]}"; do
        pattern_name=$(echo "$pattern_entry" | cut -d'|' -f1)
        pattern=$(echo "$pattern_entry" | cut -d'|' -f2-)

        # Use grep with Perl regex for better pattern matching
        matches=$(grep -nE "$pattern" "$file" 2>/dev/null)

        if [ -n "$matches" ]; then
            if [ $SECRETS_FOUND -eq 0 ]; then
                echo ""
                echo -e "${RED}❌ SECRETS DETECTED!${NC}"
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            fi

            SECRETS_FOUND=$((SECRETS_FOUND + 1))

            echo ""
            echo -e "${RED}🔑 $pattern_name found in:${NC} $file"

            # Show matching lines (but truncate long secrets for security)
            echo "$matches" | while IFS= read -r match; do
                line_num=$(echo "$match" | cut -d: -f1)
                line_content=$(echo "$match" | cut -d: -f2-)

                # Truncate very long lines
                if [ ${#line_content} -gt 100 ]; then
                    line_content="${line_content:0:100}..."
                fi

                echo -e "   ${YELLOW}Line $line_num:${NC} $line_content"
            done
        fi
    done
done <<< "$FILES_TO_PUSH"

# Check for common secret file names
SECRET_FILES=(
    ".env"
    ".env.local"
    ".env.production"
    "credentials.json"
    "serviceAccount.json"
    "google-credentials.json"
    "aws-credentials"
    "id_rsa"
    "id_dsa"
    "*.pem"
    "*.key"
    "*.p12"
    "*.pfx"
)

for secret_file_pattern in "${SECRET_FILES[@]}"; do
    if echo "$FILES_TO_PUSH" | grep -qE "$secret_file_pattern"; then
        if [ $WARNINGS_FOUND -eq 0 ]; then
            echo ""
            echo -e "${YELLOW}⚠️  WARNINGS:${NC}"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        fi
        WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
        echo -e "${YELLOW}⚠️  Attempting to push potentially sensitive file:${NC} $(echo "$FILES_TO_PUSH" | grep -E "$secret_file_pattern")"
    fi
done

# Print summary and decide whether to block
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $SECRETS_FOUND -gt 0 ]; then
    echo -e "${RED}❌ PUSH BLOCKED!${NC}"
    echo ""
    echo "Found $SECRETS_FOUND potential secret(s) in your code."
    echo ""
    echo "What to do:"
    echo "1. Remove the secrets from the files"
    echo "2. Use environment variables instead"
    echo "3. Add the files to .gitignore if they should never be committed"
    echo "4. If this is a false positive, you can bypass with:"
    echo "   git push --no-verify"
    echo ""
    echo -e "${YELLOW}⚠️  WARNING: Only bypass if you're CERTAIN these are not real secrets!${NC}"
    echo ""
    exit 1
fi

if [ $WARNINGS_FOUND -gt 0 ]; then
    echo -e "${YELLOW}⚠️  WARNING: Potentially sensitive files detected${NC}"
    echo ""
    echo "Are you sure you want to push these files? (y/N)"
    read -r response

    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${RED}Push cancelled by user${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Secret scan passed!${NC}"
echo ""
exit 0
