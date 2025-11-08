# Git Hooks - Secret Detection

This project uses git hooks to prevent accidentally pushing secrets to GitHub.

## What It Does

The **pre-push hook** automatically scans your code for secrets before every `git push`, including:

### Detected Secrets:
- ✓ Supabase Service Role Keys
- ✓ Supabase Anon Keys
- ✓ AWS Access Keys
- ✓ Stripe Secret Keys
- ✓ Stripe Restricted Keys
- ✓ OpenAI API Keys
- ✓ Anthropic (Claude) API Keys
- ✓ Generic API Keys
- ✓ Bearer Tokens
- ✓ JWT Tokens
- ✓ Private Keys (SSH, RSA, etc.)
- ✓ Database URLs with credentials
- ✓ Environment variable assignments with secrets

### Flagged Files:
- ⚠️ `.env` files
- ⚠️ `credentials.json`
- ⚠️ `*.pem`, `*.key` files
- ⚠️ Private key files

## Setup

### First Time Setup

After cloning the repository, run:

```bash
./scripts/setup-git-hooks.sh
```

This installs all git hooks automatically.

### Manual Installation

If the setup script doesn't work, you can manually install:

```bash
cp scripts/pre-push-hook.sh .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

## Usage

Once installed, the hook runs automatically on every `git push`. You'll see output like:

```
🔍 Scanning for secrets before push...
✓ Secret scan passed!
```

### If Secrets Are Detected

The push will be **blocked** and you'll see:

```
❌ SECRETS DETECTED!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔑 Supabase Service Role Key found in: config/database.ts
   Line 42: const serviceRoleKey = "eyJhbGciOiJIUzI1..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ PUSH BLOCKED!

Found 1 potential secret(s) in your code.

What to do:
1. Remove the secrets from the files
2. Use environment variables instead
3. Add the files to .gitignore if they should never be committed
4. If this is a false positive, you can bypass with:
   git push --no-verify
```

## How to Fix

### Option 1: Use Environment Variables (Recommended)

**Before (❌ Don't do this):**
```typescript
const apiKey = "sk-ant-api03-xxxxx...";
```

**After (✅ Correct):**
```typescript
const apiKey = process.env.ANTHROPIC_API_KEY;
```

Then create a `.env` file (already in `.gitignore`):
```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx...
```

### Option 2: Add to .gitignore

If the file should never be committed:

```bash
echo "config/secrets.ts" >> .gitignore
git rm --cached config/secrets.ts
```

### Option 3: Remove from Staged Files

```bash
git reset HEAD <filename>
# Edit the file to remove secrets
git add <filename>
git push
```

## Bypassing the Hook

⚠️ **Use with extreme caution!**

If you're absolutely certain there are no real secrets (false positive):

```bash
git push --no-verify
```

**Never bypass if:**
- You see actual API keys, tokens, or passwords
- You're unsure whether something is a secret
- The file contains production credentials

## For Team Members

### Why We Use This

On [DATE], we accidentally pushed a Supabase service role key to GitHub. GitGuardian detected it immediately, but the key had to be rotated and the git history cleaned.

This hook prevents that from happening again by scanning **before** the push happens.

### False Positives

The hook may occasionally flag things that aren't secrets:

- Example JWT tokens in documentation
- Test data that looks like API keys
- Long random strings in tests

In these cases:
1. Review carefully to ensure it's truly not a secret
2. If safe, use `git push --no-verify`
3. Consider updating the hook patterns if it's a common false positive

## Updating the Hook

If patterns need to be updated:

1. Edit `scripts/pre-push-hook.sh`
2. Run `./scripts/setup-git-hooks.sh` to reinstall
3. Commit the updated script so the team gets it too

## Troubleshooting

### Hook Not Running

```bash
# Check if hook is installed
ls -la .git/hooks/pre-push

# If missing, reinstall
./scripts/setup-git-hooks.sh
```

### Hook Permission Denied

```bash
chmod +x .git/hooks/pre-push
```

### Hook Blocking Valid Code

If the hook incorrectly blocks code:

1. Review the flagged content carefully
2. If it's truly safe, use `--no-verify`
3. Report the false positive so we can improve the patterns

## Additional Security

This hook is one layer of defense. Also:

- ✓ Use `.gitignore` for all secret files
- ✓ Use environment variables for all secrets
- ✓ Enable GitGuardian monitoring (already active)
- ✓ Rotate keys immediately if exposed
- ✓ Use Supabase Vault or similar for storing secrets in database

## Questions?

Contact the team lead or check the main README.md for more security guidelines.
