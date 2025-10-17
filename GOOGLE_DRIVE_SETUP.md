# Google Drive Integration Setup Guide

This guide explains how to set up Google Drive OAuth for AI Query Hub so users can connect their Google Drive accounts.

## Overview

AI Query Hub uses Google OAuth 2.0 to allow users to:
1. Sign in with their Google account
2. Grant read-only access to their Google Drive
3. Select folders to sync
4. Import documents into their knowledge base

## Prerequisites

You need:
- A Google Cloud Project
- Google Drive API enabled
- OAuth 2.0 Client ID configured
- Encryption key for storing tokens

---

## Step 1: Create Google Cloud Project

1. Go to: https://console.cloud.google.com/
2. Click **"Select a project"** → **"New Project"**
3. Project name: **AI Query Hub** (or your choice)
4. Click **"Create"**
5. Wait for project creation (30 seconds)
6. Select your new project from the dropdown

---

## Step 2: Enable Google Drive API

1. In your Google Cloud Console, go to: **APIs & Services** → **Library**
2. Search for: **"Google Drive API"**
3. Click on **Google Drive API**
4. Click **"Enable"**
5. Wait for API to be enabled

---

## Step 3: Configure OAuth Consent Screen

1. Go to: **APIs & Services** → **OAuth consent screen**
2. Select **"External"** (unless you have Google Workspace)
3. Click **"Create"**

### Fill in App Information:

**App name:** `AI Query Hub`

**User support email:** Your email address

**App logo:** (Optional - upload your logo)

**Application home page:** `https://aiqueryhub.com`

**Application privacy policy:** `https://aiqueryhub.com/privacy`

**Application terms of service:** `https://aiqueryhub.com/terms`

**Authorized domains:**
```
aiqueryhub.com
```

**Developer contact email:** Your email address

4. Click **"Save and Continue"**

### Add Scopes:

1. Click **"Add or Remove Scopes"**
2. Search for and select:
   - `https://www.googleapis.com/auth/drive.readonly` - *View the files in your Google Drive*
3. Click **"Update"**
4. Click **"Save and Continue"**

### Test Users (if in Testing mode):

1. Click **"Add Users"**
2. Add email addresses of users who can test (including yourself)
3. Click **"Save and Continue"**

4. Click **"Back to Dashboard"**

---

## Step 4: Create OAuth 2.0 Client ID

1. Go to: **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
3. Application type: **"Web application"**
4. Name: `AI Query Hub Web Client`

### Authorized JavaScript origins:

Add these URLs (one per line):
```
https://aiqueryhub.com
https://www.aiqueryhub.com
http://localhost:5173
```

### Authorized redirect URIs:

Add these URLs (one per line):
```
https://aiqueryhub.com
https://www.aiqueryhub.com
http://localhost:5173
```

5. Click **"Create"**

### Save Your Credentials:

You'll see a popup with:
- **Client ID**: Looks like `123456789-abcdefghijk.apps.googleusercontent.com`
- **Client Secret**: Looks like `GOCSPX-abc123...`

**IMPORTANT:** Copy both of these - you'll need them next!

---

## Step 5: Create API Key

1. Still in **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"API Key"**
3. Copy the API Key (looks like `AIzaSy...`)
4. Click **"Restrict Key"** (recommended)
5. Name: `AI Query Hub API Key`
6. Under **"API restrictions"**, select **"Restrict key"**
7. Choose: **Google Drive API**
8. Click **"Save"**

---

## Step 6: Configure Supabase Edge Function Secrets

Now add your Google credentials to Supabase:

1. Go to: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/settings/functions
2. Scroll to **"Secrets"** section
3. Add these secrets:

### Secret 1: Google Client ID
- Name: `GOOGLE_CLIENT_ID`
- Value: Your OAuth Client ID from Step 4
- Click **"Save"**

### Secret 2: Google API Key
- Name: `GOOGLE_API_KEY`
- Value: Your API Key from Step 5
- Click **"Save"**

### Secret 3: Token Encryption Key
- Name: `GOOGLE_TOKEN_ENCRYPTION_KEY`
- Value: Generate a strong 32+ character password with:
  - Uppercase letters
  - Lowercase letters
  - Numbers
  - Special characters
  - Example: `MyS3cur3T0k3nK3y!2024@Pr0duct10n#`
- Click **"Save"**

---

## Step 7: Configure Supabase Database Settings

The encryption key also needs to be set in the database:

1. Go to: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/settings/vault
2. Click **"New secret"**
3. Name: `google_token_encryption_key`
4. Secret: Use the **same encryption key** from Step 6, Secret 3
5. Click **"Save"**

---

## Step 8: Update Environment Variables (Local Development)

For local development, create a `.env.local` file:

```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSy...your_api_key_here
```

**Note:** These are client-side variables (VITE_ prefix), but sensitive operations happen server-side.

---

## Step 9: Deploy and Test

### Deploy Edge Functions:

If you haven't already deployed your Edge Functions:

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref fskwutnoxbbflzqrphro

# Deploy functions
supabase functions deploy get-google-config
supabase functions deploy store-google-tokens
supabase functions deploy google-drive-sync
```

### Test the Integration:

1. Go to: `https://aiqueryhub.com/add-documents`
2. Click the **"Google Drive"** tab
3. Click **"Connect Google Drive"** button
4. You should see Google's OAuth consent screen
5. Sign in with your Google account
6. Click **"Allow"** to grant permissions
7. You should see "Connected Successfully!" message
8. Click **"Browse Google Drive"** to see your files and folders
9. Select folders to sync
10. Click **"Sync"** to import documents

---

## Troubleshooting

### "Access blocked: This app's request is invalid"

**Solution:** Make sure you added your domain to **Authorized JavaScript origins** in Step 4.

### "redirect_uri_mismatch"

**Solution:** Add all your domain variations to **Authorized redirect URIs** in Step 4.

### "API key not valid"

**Solution:**
1. Check that you enabled Google Drive API (Step 2)
2. Verify API key is correct in Supabase secrets
3. Make sure API key has Drive API restriction

### "Token encryption key not configured"

**Solution:**
1. Add `GOOGLE_TOKEN_ENCRYPTION_KEY` to Supabase Edge Functions secrets
2. Add `google_token_encryption_key` to Supabase Vault
3. Make sure both are the same value

### "No Google Drive access token found"

**Solution:** User needs to reconnect their Google Drive account:
1. Go to Add Documents → Google Drive tab
2. Click "Connect Google Drive" or "Reconnect"
3. Grant permissions again

### Tokens expire too quickly

**Solution:** Tokens expire after 1 hour by default. The system should automatically prompt for reconnection. If users experience frequent disconnections:
1. Check that `expires_in` is being properly stored
2. Verify token refresh logic is working
3. Consider implementing refresh tokens (requires `offline` access scope)

---

## Security Best Practices

1. **Never commit credentials** to Git
2. **Use environment variables** for all sensitive data
3. **Rotate encryption keys** periodically
4. **Monitor API usage** in Google Cloud Console
5. **Set up billing alerts** to avoid unexpected charges
6. **Review OAuth scopes** - only request what you need
7. **Enable 2FA** on your Google Cloud account
8. **Regularly audit** token access logs in Supabase

---

## Production Checklist

Before going live:

- [ ] OAuth consent screen verified by Google
- [ ] Production domain added to authorized origins
- [ ] API quotas reviewed and increased if needed
- [ ] Encryption key is strong (32+ characters)
- [ ] All secrets configured in production Supabase
- [ ] Edge Functions deployed to production
- [ ] Test OAuth flow from production domain
- [ ] Monitor error rates and token usage
- [ ] Set up alerts for API quota limits
- [ ] Privacy policy and terms of service published
- [ ] User documentation created

---

## OAuth Consent Screen Verification (Optional but Recommended)

To remove the "unverified app" warning:

1. Go to: **OAuth consent screen** in Google Cloud Console
2. Click **"Publish App"**
3. Click **"Prepare for Verification"**
4. Follow Google's verification process
5. Provide:
   - Homepage URL
   - Privacy policy
   - Terms of service
   - Demo video showing OAuth flow
   - Explanation of why you need Drive access

Verification can take 2-6 weeks.

---

## Support

For more information:
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## Summary

Once configured, users will:
1. Click "Connect Google Drive" button
2. See Google's standard OAuth consent screen
3. Sign in with their Google account
4. Click "Allow" to grant read-only Drive access
5. Immediately see their folders and files
6. Select what to sync
7. Documents automatically import to their knowledge base

All tokens are encrypted and stored securely in Supabase.
