# Microsoft 365 Integration Setup Guide

This guide will walk you through setting up Microsoft 365 (OneDrive/SharePoint) integration for AI Query Hub. This allows users to connect their Microsoft accounts and sync documents from OneDrive and SharePoint.

## Prerequisites

- An Azure account (you can use your Microsoft 365 admin account)
- Access to Azure Active Directory (Azure AD) / Microsoft Entra ID
- Admin access to your Supabase project

## Step 1: Register an Azure AD Application

1. **Navigate to Azure Portal**
   - Go to https://portal.azure.com
   - Sign in with your Microsoft account

2. **Open Azure Active Directory**
   - Search for "Azure Active Directory" or "Microsoft Entra ID" in the search bar
   - Click on it to open the Azure AD dashboard

3. **Register a New Application**
   - In the left sidebar, click on "App registrations"
   - Click "+ New registration" at the top
   - Fill in the application details:
     - **Name**: `AI Query Hub` (or your application name)
     - **Supported account types**: Select one of:
       - "Accounts in this organizational directory only" (Single tenant) - for your organization only
       - "Accounts in any organizational directory" (Multi-tenant) - for business customers
       - "Accounts in any organizational directory and personal Microsoft accounts" (Multi-tenant + Personal) - for widest compatibility
     - **Redirect URI**:
       - Platform: `Web`
       - URI: `https://your-app-domain.com/auth/microsoft/callback`
       - For local development: `http://localhost:5173/auth/microsoft/callback`
   - Click "Register"

4. **Note Your Application IDs**
   - After registration, you'll see the Overview page
   - Copy and save these values:
     - **Application (client) ID** - This is your `MICROSOFT_CLIENT_ID`
     - **Directory (tenant) ID** - This is your `MICROSOFT_TENANT_ID`

## Step 2: Configure API Permissions

1. **Add API Permissions**
   - In your app registration, click on "API permissions" in the left sidebar
   - Click "+ Add a permission"
   - Select "Microsoft Graph"
   - Select "Delegated permissions"
   - Add the following permissions:
     - `User.Read` - Read user profile (Basic)
     - `Files.Read.All` - Read all files user can access
     - `Sites.Read.All` - Read SharePoint sites
     - `offline_access` - Maintain access to data you have given it access to
   - Click "Add permissions"

2. **Grant Admin Consent** (Optional but Recommended)
   - If you're setting this up for an organization, click "Grant admin consent for [Your Organization]"
   - This pre-approves the permissions for all users in your organization
   - Otherwise, each user will need to consent individually on first login

## Step 3: Configure Authentication

1. **Add Additional Redirect URIs** (if needed)
   - Go to "Authentication" in the left sidebar
   - Under "Platform configurations" → "Web"
   - Add any additional redirect URIs for staging/production environments
   - Example: `https://staging.yourapp.com/auth/microsoft/callback`

2. **Configure Token Settings**
   - Scroll down to "Implicit grant and hybrid flows"
   - **Do NOT enable** ID tokens or Access tokens (we use Authorization Code Flow with PKCE)
   - Under "Allow public client flows", set to "No"

3. **Configure Advanced Settings**
   - Scroll to "Advanced settings"
   - Set "Allow public client flows" to "No"
   - Set "Enable the following mobile and desktop flows" to "No"

## Step 4: Generate Encryption Key

We store Microsoft OAuth tokens encrypted in the database. Generate a strong encryption key:

```bash
# Generate a 32-character random encryption key
openssl rand -hex 32
```

Save this key securely - you'll need it for Supabase configuration.

## Step 5: Configure Supabase Secrets

1. **Navigate to Supabase Dashboard**
   - Go to your project at https://supabase.com/dashboard
   - Select your project

2. **Add Edge Function Secrets**
   - Go to "Project Settings" → "Edge Functions" → "Secrets"
   - Add the following secrets:

   ```
   MICROSOFT_CLIENT_ID=<your-application-client-id>
   MICROSOFT_TENANT_ID=<your-directory-tenant-id>
   ```

   For multi-tenant apps, use `common` as the tenant ID:
   ```
   MICROSOFT_TENANT_ID=common
   ```

3. **Configure Database Secret**
   - Go to "SQL Editor" in Supabase
   - Run this SQL command to set the encryption key:

   ```sql
   -- Set Microsoft token encryption key
   ALTER DATABASE postgres SET app.microsoft_token_encryption_key = 'your-32-character-encryption-key-here';

   -- Verify it was set
   SELECT current_setting('app.microsoft_token_encryption_key', true);
   ```

## Step 6: Run Database Migrations

1. **Apply Microsoft Integration Schema**
   - In Supabase Dashboard, go to "SQL Editor"
   - Run the migration file: `supabase/migrations/20251017_microsoft_integration.sql`
   - This creates tables for:
     - `user_microsoft_tokens` - Encrypted token storage
     - `microsoft_token_audit_log` - Access audit trail
     - `microsoft_token_rate_limit` - Rate limiting protection
     - `microsoft_drive_folders` - Connected OneDrive/SharePoint folders

2. **Add Microsoft File ID to Documents**
   - Run the migration file: `supabase/migrations/20251017_add_microsoft_file_id.sql`
   - This adds `microsoft_file_id` column to `knowledge_documents` table

## Step 7: Deploy Edge Functions

Deploy the Microsoft integration Edge Functions to Supabase:

```bash
# Deploy all Edge Functions
supabase functions deploy get-microsoft-config
supabase functions deploy store-microsoft-tokens
supabase functions deploy microsoft-drive-sync
```

## Step 8: Test the Integration

1. **Local Testing**
   - Start your development server: `npm run dev`
   - Navigate to "Add Documents" → "Microsoft 365" tab
   - Click "Connect Microsoft 365"
   - You should be redirected to Microsoft login
   - Sign in and grant permissions
   - You should be redirected back to your app

2. **Verify Token Storage**
   - In Supabase, go to "Table Editor"
   - Check the `user_microsoft_tokens` table
   - You should see an encrypted token entry for your user

3. **Test File Browsing**
   - Click "Browse OneDrive / SharePoint"
   - You should see your OneDrive files
   - Select a folder and sync it

## Troubleshooting

### Error: "AADSTS50011: The redirect URI specified in the request does not match"

**Solution**:
- Verify the redirect URI in your Azure app registration exactly matches your app's callback URL
- Include the protocol (https://) and don't add trailing slashes

### Error: "AADSTS650053: The application asked for a scope that doesn't exist"

**Solution**:
- Go to Azure AD → App registrations → Your app → API permissions
- Verify all required permissions are added (User.Read, Files.Read.All, Sites.Read.All, offline_access)
- Click "Grant admin consent" if you have admin rights

### Error: "Microsoft token encryption key not configured"

**Solution**:
- Run the SQL command from Step 5.3 to set the encryption key
- Make sure you're using a valid encryption key (32+ characters)
- Restart your Supabase Edge Functions after setting the key

### Error: "No valid Microsoft tokens found"

**Solution**:
- The user's token may have expired (tokens typically last 1 hour)
- Ask the user to reconnect their Microsoft account
- Check `user_microsoft_tokens` table - the `expires_at` timestamp should be in the future

### Error: "Rate limit exceeded"

**Solution**:
- The system allows 100 token accesses per hour per user
- Wait for the rate limit window to reset (1 hour)
- Check `microsoft_token_rate_limit` table for details

### Files not syncing

**Solution**:
- Check the `sync_jobs` table for error messages
- Verify the user has read permissions for the files
- Check that the Microsoft Graph API token hasn't expired
- Look at Supabase Edge Function logs for detailed errors

## Security Best Practices

1. **Use HTTPS in Production**: Always use HTTPS for redirect URIs in production
2. **Rotate Encryption Keys**: Periodically rotate your token encryption key
3. **Monitor Audit Logs**: Regularly review the `microsoft_token_audit_log` table
4. **Enable Multi-Factor Authentication**: Require MFA for Microsoft accounts
5. **Limit Permissions**: Only request the minimum required OAuth scopes
6. **Review Rate Limits**: Monitor the `microsoft_token_rate_limit` table for suspicious activity

## Architecture Overview

### OAuth Flow (PKCE)

1. User clicks "Connect Microsoft 365"
2. Frontend generates PKCE code verifier and challenge
3. User is redirected to Microsoft login with code challenge
4. User authenticates and grants permissions
5. Microsoft redirects back with authorization code
6. Frontend exchanges code + verifier for tokens
7. Tokens are encrypted and stored in Supabase via Edge Function

### File Sync Flow

1. User selects a folder from Microsoft 365
2. Folder details are saved to `microsoft_drive_folders` table
3. User clicks "Sync" to trigger sync
4. Edge Function `microsoft-drive-sync` is invoked
5. Function fetches files using Microsoft Graph API
6. Files are downloaded, chunked, and stored in `knowledge_documents`
7. AI analysis is triggered for each document
8. Sync job status is updated

### Token Security

- All tokens are encrypted using PGP symmetric encryption (AES-256-GCM)
- Encryption key is stored in Supabase database settings, not in code
- Token access is rate-limited (100 accesses/hour per user)
- All token access is audited with IP address and user agent
- Tokens automatically expire and require re-authentication

## Production Deployment Checklist

- [ ] Azure AD app is configured with production redirect URI
- [ ] API permissions are granted (preferably with admin consent)
- [ ] Encryption key is set in Supabase database
- [ ] All three Edge Functions are deployed
- [ ] Database migrations are applied
- [ ] HTTPS is enabled for the application
- [ ] Secrets are set in Supabase Edge Functions configuration
- [ ] Test the complete OAuth flow in production
- [ ] Test file sync from OneDrive and SharePoint
- [ ] Monitor audit logs and rate limits for the first week

## Support

For issues or questions:
- Check the Troubleshooting section above
- Review Supabase Edge Function logs
- Check Azure AD sign-in logs
- Verify API permissions in Azure portal
- Check database triggers and RLS policies

## References

- [Microsoft Graph API Documentation](https://learn.microsoft.com/en-us/graph/)
- [Azure AD App Registration Guide](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [OAuth 2.0 Authorization Code Flow with PKCE](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [Microsoft Graph Files API](https://learn.microsoft.com/en-us/graph/api/resources/onedrive)
