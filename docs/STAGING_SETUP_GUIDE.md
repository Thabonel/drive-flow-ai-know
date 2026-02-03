# Staging Environment Setup Guide

This guide documents the staging environment setup for AI Query Hub.

## 🏗️ Architecture

**Production Site**:
- Branch: `main`
- URL: `https://aiqueryhub-prod.netlify.app` (replace with your actual URL)
- Environment: `production`

**Staging Site**:
- Branch: `staging`
- URL: `https://aiqueryhub-staging.netlify.app` (replace with your actual URL)
- Environment: `staging`

## ✅ Implementation Completed

### 1. Environment Configuration
- ✅ Created `src/config/environment.ts` for environment detection
- ✅ Added staging banner to `src/App.tsx`
- ✅ Updated `netlify.toml` with staging context
- ✅ Updated `.env.example` with environment variable

### 2. Branch Setup
```bash
# Staging branch created and ready
git checkout staging
git push -u origin staging
```

### 3. Netlify Configuration
Both sites need these environment variables:

**Production Site**:
```
VITE_SUPABASE_URL=https://fskwutnoxbbflzqrphro.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_ENVIRONMENT=production
```

**Staging Site**:
```
VITE_SUPABASE_URL=https://fskwutnoxbbflzqrphro.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
VITE_ENVIRONMENT=staging
```

## 🚀 Next Steps for Netlify Setup

### Step 1: Create Staging Site
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "New site from Git"
3. Choose your repository
4. Configure:
   - **Branch**: `staging`
   - **Build command**: `npm install --legacy-peer-deps && npm run build`
   - **Publish directory**: `dist`
   - **Site name**: `aiqueryhub-staging`

### Step 2: Set Environment Variables
In Netlify Dashboard → Site Settings → Environment Variables:

Add the variables listed above for each site.

### Step 3: Test Deployment
```bash
# Push to staging to trigger deploy
git checkout staging
git add .
git commit -m "Add staging environment configuration"
git push origin staging

# Check that staging site shows orange banner: "🚧 Staging Environment"
```

## 🔄 Development Workflow

### Safe Development Process
```bash
# 1. Start from staging
git checkout staging
git pull origin staging

# 2. Create feature branch
git checkout -b feature/your-feature

# 3. Develop and test locally
npm run dev

# 4. Push feature for review (optional deploy preview)
git push -u origin feature/your-feature

# 5. Merge to staging for testing
git checkout staging
git merge feature/your-feature
git push origin staging
# → Deploys to staging site automatically

# 6. Test on staging environment
# Visit https://aiqueryhub-staging.netlify.app

# 7. When ready, merge staging to main
git checkout main
git merge staging
git push origin main
# → Deploys to production automatically
```

### Branch Protection (Recommended)
Set up in GitHub Repository Settings → Branches:

**Protect `main` branch**:
- ✅ Require pull request reviews
- ✅ Require status checks (Netlify deployment)
- ✅ Require branches to be up to date
- ✅ Restrict pushes to matching branches

## 🎯 Features Added

### Environment Detection
- **Staging Banner**: Orange banner shows "🚧 Staging Environment"
- **Console Logging**: Enhanced debug logs in staging/development
- **Feature Flags**: Beta features enabled only in staging
- **Analytics**: Disabled in staging, enabled only in production

### Visual Indicators
- **Staging**: Orange banner at top of app
- **Offline Mode**: Yellow banner (existing)
- **Title**: "AI Query Hub (Staging)" vs "AI Query Hub"

## 🧪 Testing Checklist

After setup, verify:

### Staging Environment
- [ ] Site loads at staging URL
- [ ] Orange staging banner visible
- [ ] Google integrations work
- [ ] AI queries function properly
- [ ] Database operations successful
- [ ] Console shows debug logs

### Production Environment
- [ ] Site loads at production URL
- [ ] No staging banner visible
- [ ] All features working
- [ ] Analytics enabled (if implemented)
- [ ] Performance optimized

## 🔧 Configuration Files Modified

### `/src/config/environment.ts` ✅
Environment detection and feature flags

### `/src/App.tsx` ✅
Staging banner integration

### `/netlify.toml` ✅
Multi-environment build configuration

### `/.env.example` ✅
Environment variable documentation

## 🚨 Troubleshooting

### Staging Banner Not Showing
- Check `VITE_ENVIRONMENT=staging` in Netlify environment variables
- Verify staging branch is deployed
- Check browser console for errors

### Build Failures
- Ensure `--legacy-peer-deps` in build command
- Check Node version is 18.x
- Verify all environment variables are set

### Database Issues
- Confirm Supabase URL and keys are correct
- Check RLS policies allow access
- Verify network connectivity to Supabase

## 📞 Support

If you encounter issues:
1. Check Netlify build logs
2. Review browser console errors
3. Verify environment variables are set correctly
4. Test locally with staging environment variables

## 🎉 Deployment Ready

Your staging environment is now configured and ready for safe development!

**Next Steps**:
1. Create staging site on Netlify
2. Set environment variables
3. Test first deployment
4. Set up branch protection rules
5. Start using staging → production workflow