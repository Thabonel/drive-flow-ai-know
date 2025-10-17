# Deploying AI Query Hub to Netlify

## Prerequisites
- Netlify account (sign up at https://netlify.com)
- GitHub repository with your code pushed
- Custom domain: aiqueryhub.com (registered with Squarespace)

## Step 1: Push Your Code to GitHub

Make sure all your changes are committed and pushed:

```bash
git add .
git commit -m "Add Netlify configuration and deployment setup"
git push origin main
```

## Step 2: Deploy to Netlify

### Option A: Via Netlify Dashboard (Recommended)

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Choose "GitHub" and authorize Netlify
4. Select your repository: `aiqueryhub`
5. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Branch to deploy:** `main`

6. Add environment variables:
   - Click "Show advanced" → "New variable"
   - Add these variables:
     - `VITE_SUPABASE_URL` = `https://fskwutnoxbbflzqrphro.supabase.co`
     - `VITE_SUPABASE_PUBLISHABLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZza3d1dG5veGJiZmx6cXJwaHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNTU4OTgsImV4cCI6MjA2MTYzMTg5OH0.mdteRFDt2-JcAGLuuUkyC55zjyVJmyN6QeJ33hYBHBQ`
     - `VITE_SUPABASE_PROJECT_ID` = `fskwutnoxbbflzqrphro`

7. Click "Deploy site"

### Option B: Via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
netlify init

# Follow the prompts:
# - Create & configure a new site
# - Choose your team
# - Site name: aiqueryhub (or leave blank for auto-generated)
# - Build command: npm run build
# - Directory to deploy: dist

# Set environment variables
netlify env:set VITE_SUPABASE_URL "https://fskwutnoxbbflzqrphro.supabase.co"
netlify env:set VITE_SUPABASE_PUBLISHABLE_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZza3d1dG5veGJiZmx6cXJwaHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNTU4OTgsImV4cCI6MjA2MTYzMTg5OH0.mdteRFDt2-JcAGLuuUkyC55zjyVJmyN6QeJ33hYBHBQ"
netlify env:set VITE_SUPABASE_PROJECT_ID "fskwutnoxbbflzqrphro"

# Deploy
netlify deploy --prod
```

## Step 3: Configure Custom Domain (aiqueryhub.com)

### In Netlify Dashboard:

1. Go to your site in Netlify
2. Navigate to **Site configuration** → **Domain management**
3. Click **Add a domain**
4. Enter `aiqueryhub.com`
5. Click **Verify**
6. Netlify will provide DNS records

### In Squarespace DNS Settings:

1. Log in to Squarespace
2. Go to **Settings** → **Domains** → **aiqueryhub.com** → **DNS Settings**
3. Add/Update the following records:

**For Apex Domain (aiqueryhub.com):**
- **Type:** A
- **Host:** @
- **Value:** 75.2.60.5 (Netlify's load balancer IP)

**For WWW subdomain:**
- **Type:** CNAME
- **Host:** www
- **Value:** [your-site-name].netlify.app

**Alternative (Recommended - Use Netlify DNS):**
- In Netlify, go to **Domain management** → **Nameservers**
- Copy the Netlify nameservers (e.g., dns1.p08.nsone.net)
- In Squarespace, change the nameservers to Netlify's nameservers
- This gives Netlify full DNS control and enables better features

4. Wait for DNS propagation (can take 24-48 hours, usually faster)
5. In Netlify, enable HTTPS (automatic with Let's Encrypt)

## Step 4: Update Supabase Allowed Origins

1. Go to Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Add to **Site URL:** `https://aiqueryhub.com`
5. Add to **Redirect URLs:**
   - `https://aiqueryhub.com/**`
   - `https://www.aiqueryhub.com/**`
   - `https://[your-netlify-subdomain].netlify.app/**` (for testing)

## Step 5: Update CORS for Edge Functions

In your Supabase Edge Functions, update CORS headers to allow your domain:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://aiqueryhub.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
};
```

Or allow multiple origins:
```typescript
const allowedOrigins = [
  'https://aiqueryhub.com',
  'https://www.aiqueryhub.com',
  'https://drive-flow-ai-know.lovable.app',
];

const origin = req.headers.get('origin');
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  // ... rest of headers
};
```

## Step 6: Verify Deployment

1. Visit https://aiqueryhub.com
2. Test key functionality:
   - User authentication (sign up/login)
   - Document upload
   - AI queries
   - Google Drive sync
   - Knowledge base creation

## Continuous Deployment

Once set up, Netlify will automatically deploy whenever you push to your main branch:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

## Troubleshooting

### Build Fails
- Check build logs in Netlify dashboard
- Verify all environment variables are set correctly
- Ensure `package.json` dependencies are correct

### CORS Errors
- Verify Supabase allowed origins include your domain
- Check Edge Function CORS headers
- Ensure requests include proper authentication headers

### Domain Not Working
- Check DNS propagation: https://www.whatsmydns.net
- Verify DNS records in Squarespace match Netlify requirements
- Wait 24-48 hours for full DNS propagation
- Try clearing browser cache or using incognito mode

### Environment Variables Not Working
- Ensure variables start with `VITE_` prefix
- Restart build after adding new variables
- Check variable names match exactly (case-sensitive)

## Additional Configuration

### Enable Netlify Forms (Optional)
Add to `netlify.toml`:
```toml
[build.environment]
  ENABLE_FORMS = "true"
```

### Branch Previews
Netlify automatically creates preview deployments for pull requests.

### Analytics
Enable Netlify Analytics in the dashboard for visitor insights.

## Support

- Netlify Docs: https://docs.netlify.com
- Netlify Support: https://support.netlify.com
- Supabase Docs: https://supabase.com/docs
