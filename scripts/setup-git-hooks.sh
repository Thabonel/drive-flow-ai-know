#!/bin/bash

# Setup script to install git hooks for the project
# Run this after cloning the repository

echo "🔧 Setting up git hooks..."

# Get the repository root directory
REPO_ROOT=$(git rev-parse --show-toplevel)

if [ -z "$REPO_ROOT" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

HOOKS_DIR="$REPO_ROOT/.git/hooks"
SCRIPTS_DIR="$REPO_ROOT/scripts"

# Ensure hooks directory exists
mkdir -p "$HOOKS_DIR"

# Install pre-push hook
if [ -f "$SCRIPTS_DIR/pre-push-hook.sh" ]; then
    echo "📋 Installing pre-push hook (secret scanner)..."
    cp "$SCRIPTS_DIR/pre-push-hook.sh" "$HOOKS_DIR/pre-push"
    chmod +x "$HOOKS_DIR/pre-push"
    echo "✓ Pre-push hook installed"
else
    echo "⚠️  Warning: pre-push-hook.sh not found in scripts directory"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Git hooks setup complete!"
echo ""
echo "Installed hooks:"
echo "  • pre-push: Scans for secrets before pushing to GitHub"
echo ""
echo "To bypass hooks (use with caution!):"
echo "  git push --no-verify"
echo ""
echo "To update hooks in the future, just run this script again."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
