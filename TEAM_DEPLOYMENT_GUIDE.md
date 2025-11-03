# Team Collaboration Features - Deployment Guide

This guide walks through deploying the complete team collaboration infrastructure to Supabase.

## 📋 Pre-Deployment Checklist

- [ ] Supabase CLI installed and authenticated
- [ ] Project linked to Supabase (`supabase link`)
- [ ] All code committed and pushed to GitHub
- [ ] Backup created (branch: `backup-before-team-ui-20251103-112832`)

## 🗄️ Step 1: Deploy Database Migration

### What This Does
Creates the team collaboration database schema:
- `teams` table
- `team_members` table with roles (owner/admin/member/viewer)
- `team_invitations` table with token-based invitations
- Adds `team_id` and `visibility` fields to existing tables
- Sets up Row Level Security (RLS) policies
- Creates helper functions for team access checks

### Commands

```bash
# Navigate to project root
cd /Users/thabonel/Code/aiqueryhub

# Check which migrations will be applied
supabase db diff

# Apply the migration
supabase db push
```

### What to Look For
```
✓ Applying migration 20251103100000_create_team_collaboration_infrastructure.sql...
✓ Migration complete
```

### Verification
```bash
# Connect to database and verify tables exist
supabase db reset --dry-run

# Or check via Supabase Dashboard:
# https://app.supabase.com/project/fskwutnoxbbflzqrphro/editor
```

### Troubleshooting
- **Error: "migration already applied"** - Migration was already deployed, safe to skip
- **Error: "permission denied"** - Check service role key is configured
- **Error: "relation already exists"** - Some tables may exist from previous work, review carefully

---

## 🚀 Step 2: Deploy Edge Functions

### Required Environment Variables
Before deploying functions, ensure these secrets are set in Supabase:

```bash
# Check existing secrets
supabase secrets list

# Set required secrets (if not already set)
supabase secrets set SUPABASE_URL=https://fskwutnoxbbflzqrphro.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set FRONTEND_URL=https://your-frontend-domain.com
```

### Deploy New Team Functions

#### 1. create-team
Creates a new team (requires active Business/Enterprise subscription)

```bash
supabase functions deploy create-team
```

**Expected Output:**
```
✓ Deployed Function create-team
Function URL: https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/create-team
```

#### 2. invite-team-member
Sends email invitation to join team

```bash
supabase functions deploy invite-team-member
```

**Expected Output:**
```
✓ Deployed Function invite-team-member
Function URL: https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/invite-team-member
```

#### 3. accept-team-invitation
Accepts team invitation via token

```bash
supabase functions deploy accept-team-invitation
```

**Expected Output:**
```
✓ Deployed Function accept-team-invitation
Function URL: https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/accept-team-invitation
```

### Deploy Modified Functions

#### 4. ai-query (CRITICAL - Team Context)
Updated to include team documents in AI queries

```bash
supabase functions deploy ai-query
```

**What Changed:**
- Fetches user's team memberships
- Includes team documents in context retrieval
- Tags documents with [Personal] or [Team: Name]
- Updates system message for team context awareness

**Expected Output:**
```
✓ Deployed Function ai-query
Function URL: https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/ai-query
```

### Verification
Test each function:

```bash
# Test create-team (requires auth token)
curl -X POST \
  https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/create-team \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Team", "slug": "test-team"}'

# Should return either:
# - Success: {"team": {...}}
# - Error: {"error": "No active Business or Enterprise subscription found"}
```

---

## 🎨 Step 3: Frontend Verification

The frontend is already deployed via Netlify (auto-deploys from main branch).

### Check Deployment Status

1. **Go to Netlify Dashboard**
   - https://app.netlify.com/sites/YOUR_SITE_NAME/deploys
   - Verify latest deploy shows commit `392c8ba`

2. **Verify Build Success**
   - Look for: "Site is live ✓"
   - Check for TypeScript errors in build logs

### Frontend Verification Checklist

#### For Entry Tier Users (No Subscription)
- [ ] NO team section in sidebar
- [ ] NO team-related routes accessible
- [ ] Homepage shows team features in "What You Get" section

#### For Business Tier Users (After Subscribing)
- [ ] Team section appears in sidebar
- [ ] Can navigate to /team/create
- [ ] Can create team (if subscription valid)
- [ ] Can access /team/settings, /team/members, /team/documents, /team/timeline

#### FeatureGate Verification
- [ ] `FeatureGate` component correctly checks subscription tier
- [ ] Team features invisible without Business/Enterprise subscription
- [ ] No "upgrade" banners or upsell messaging

---

## 🧪 Step 4: End-to-End Testing

### Test Flow 1: Create Team (Business User)

1. **Subscribe to Business Plan**
   - Go to /settings/billing
   - Subscribe to Business plan ($150/month)
   - Verify payment successful

2. **Create Team**
   - Navigate to /team/create
   - Enter team name and slug
   - Click "Create Team"
   - Verify redirect to /team/settings

3. **Verify Team Created**
   - Check Supabase database:
     ```sql
     SELECT * FROM teams WHERE owner_user_id = 'YOUR_USER_ID';
     ```
   - Should see new team record

### Test Flow 2: Invite Team Member

1. **Go to Team Members**
   - Navigate to /team/members
   - Click "Invite Member"

2. **Send Invitation**
   - Enter email address
   - Select role (member/admin/viewer)
   - Click "Send Invitation"

3. **Verify Invitation Created**
   ```sql
   SELECT * FROM team_invitations WHERE team_id = 'YOUR_TEAM_ID';
   ```
   - Should see invitation with token

4. **Accept Invitation**
   - Copy invitation token from database
   - Navigate to `/accept-invite/TOKEN`
   - Click "Accept Invitation"
   - Verify redirect to /team/settings

5. **Verify Membership**
   ```sql
   SELECT * FROM team_members WHERE team_id = 'YOUR_TEAM_ID';
   ```
   - Should see both owner and new member

### Test Flow 3: Upload Team Document

1. **Upload Document**
   - Go to /documents/add?team=true
   - Upload a document
   - Set visibility to "team"

2. **Verify Document Access**
   ```sql
   SELECT * FROM knowledge_documents
   WHERE team_id = 'YOUR_TEAM_ID'
   AND visibility = 'team';
   ```

3. **Test AI Query with Team Context**
   - Go to /dashboard
   - Ask a question about the team document
   - Verify response includes `[Team: Team Name]` attribution
   - Have another team member ask the same question
   - Verify they get the same context

### Test Flow 4: Team Timeline

1. **Create Team Timeline Item**
   - Go to /timeline
   - Create a new task
   - Set visibility to "team"
   - Assign to a team member

2. **Verify Team Access**
   - Other team members navigate to /team/timeline
   - Should see the shared task
   - Filter by assigned member
   - Verify filters work

---

## 🔍 Verification Queries

Run these SQL queries in Supabase SQL Editor to verify deployment:

```sql
-- Check team infrastructure exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('teams', 'team_members', 'team_invitations');

-- Check RLS policies are active
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('teams', 'team_members', 'team_invitations');

-- Check helper functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_user_teams', 'is_team_member', 'has_team_role', 'is_team_admin');

-- Check existing tables have team fields
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'knowledge_documents'
AND column_name IN ('team_id', 'visibility');

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'timeline_items'
AND column_name IN ('team_id', 'visibility', 'assigned_to');
```

---

## 🐛 Troubleshooting

### Migration Issues

**Problem:** Migration fails with "column already exists"
```
Solution: Check if partial migration was applied before
- Run: SELECT * FROM schema_migrations;
- If migration is listed, it was applied
- Manually verify tables/columns exist
```

**Problem:** RLS policies prevent access
```
Solution: Test RLS policies
- Connect as service role to bypass RLS
- Verify user auth tokens are valid
- Check get_user_teams() function works
```

### Edge Function Issues

**Problem:** Function returns 401 Unauthorized
```
Solution: Check authorization header
- Verify user token is fresh (not expired)
- Ensure "Authorization: Bearer TOKEN" format
- Test with supabase.auth.getSession()
```

**Problem:** create-team returns "No active subscription"
```
Solution: Verify subscription data
- Check user_subscriptions table
- Ensure status = 'active'
- Ensure plan_tier = 'business' or 'enterprise'
- Verify subscription_id is set
```

**Problem:** invite-team-member fails
```
Solution: Check team capacity
- Verify member count < max_members
- Check for duplicate invitations
- Ensure email is valid format
```

### Frontend Issues

**Problem:** Team navigation not appearing
```
Solution: Check FeatureGate logic
- Verify subscription query in useQuery
- Check plan_tier value in database
- Test with React DevTools
```

**Problem:** TypeScript errors in build
```
Solution: Regenerate types
- Run: supabase gen types typescript --local
- Update src/integrations/supabase/types.ts
- Rebuild frontend
```

---

## ✅ Post-Deployment Checklist

- [ ] All migrations applied successfully
- [ ] All Edge Functions deployed
- [ ] Environment variables configured
- [ ] Frontend build successful
- [ ] Entry tier users see NO team features
- [ ] Business tier users see team navigation
- [ ] Team creation works for Business users
- [ ] Team invitations send and accept correctly
- [ ] Team documents accessible in AI queries
- [ ] Team timeline shows shared items
- [ ] RLS policies enforce proper access control
- [ ] No console errors in browser
- [ ] No function errors in Supabase logs

---

## 📊 Monitoring

### Check Function Logs

```bash
# View logs for specific function
supabase functions logs create-team --tail
supabase functions logs invite-team-member --tail
supabase functions logs accept-team-invitation --tail
supabase functions logs ai-query --tail
```

### Check Database Activity

```sql
-- Monitor team creation
SELECT COUNT(*), MAX(created_at)
FROM teams;

-- Monitor member invitations
SELECT COUNT(*), status
FROM team_invitations
GROUP BY status;

-- Monitor team membership growth
SELECT COUNT(*), role
FROM team_members
GROUP BY role;

-- Check team document usage
SELECT COUNT(*)
FROM knowledge_documents
WHERE team_id IS NOT NULL;
```

---

## 🎯 Success Criteria

Deployment is successful when:

1. ✅ Database migration completes without errors
2. ✅ All 4 Edge Functions deploy successfully
3. ✅ Frontend builds and deploys to Netlify
4. ✅ Business tier users can create teams
5. ✅ Team invitations work end-to-end
6. ✅ Team documents appear in AI queries with correct attribution
7. ✅ Entry tier users see zero team features
8. ✅ RLS policies protect team data appropriately
9. ✅ No errors in Supabase function logs
10. ✅ No TypeScript errors in frontend build

---

## 🆘 Rollback Plan

If deployment fails catastrophically:

```bash
# Restore code to backup branch
git checkout backup-before-team-ui-20251103-112832

# Restore database (if needed)
# NOTE: This will lose all team data created since migration
supabase db reset

# Redeploy previous Edge Functions versions
# (Supabase keeps function version history)

# Notify team about rollback
# Document what went wrong for post-mortem
```

---

## 📞 Support

- **Supabase Issues**: https://github.com/supabase/supabase/issues
- **Edge Function Docs**: https://supabase.com/docs/guides/functions
- **RLS Policy Docs**: https://supabase.com/docs/guides/auth/row-level-security

---

Generated: 2025-11-03
Version: 1.0
Status: Ready for deployment 🚀
