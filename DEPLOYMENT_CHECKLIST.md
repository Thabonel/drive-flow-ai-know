# Email Confirmation Fix - Deployment Checklist

## Quick Reference Card

**Date**: 2026-01-28
**Commit**: `1ac0ed8`
**Priority**: HIGH (Critical Auth Bug)
**Risk Level**: MEDIUM
**Estimated Downtime**: None

---

## Pre-Deployment

### 1. Database Check ✓
Run this query to check for affected legacy users:

```sql
SELECT
  count(*) as affected_users,
  min(created_at) as oldest_account
FROM auth.users
WHERE email_confirmed_at IS NULL
  AND created_at < '2024-01-01';
```

**Action**: If count > 0, manually confirm via admin panel OR adjust grace period date

---

### 2. Environment Variables Check ✓
Verify these are set in Supabase:
- `RESEND_API_KEY` (for email sending)
- `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)

---

### 3. Backup Current State ✓
```bash
# Backup current deployment
git tag pre-email-fix-deployment-$(date +%Y%m%d)
git push origin --tags
```

---

## Deployment Steps

### Step 1: Deploy Frontend ✓

```bash
# Frontend is already built
npm run build

# Deploy dist/ to hosting provider
# (Vercel/Netlify/AWS - use your normal process)
```

**Verification**: Visit https://aiqueryhub.com and check version

---

### Step 2: Login to Supabase CLI ✓

```bash
# Option A: Interactive login
npx supabase login

# Option B: Link project
npx supabase link --project-ref fskwutnoxbbflzqrphro
```

**Verification**: Run `npx supabase projects list` to confirm

---

### Step 3: Deploy Edge Functions ✓

```bash
cd supabase/functions

# Deploy admin-users function (fixes email confirmation API)
npx supabase functions deploy admin-users

# Deploy send-confirmation-email function (brand colors)
npx supabase functions deploy send-confirmation-email
```

**Expected Output**:
```
Deploying admin-users (project ref: fskwutnoxbbflzqrphro)
✓ Function deployed successfully
Function URL: https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/admin-users
```

**Verification**: Check function logs in Supabase dashboard

---

## Post-Deployment Verification

### Quick Test (5 minutes)

**Test 1: Normal Confirmation Flow**
1. Sign up: `test+deploy@example.com` / `TestPass123!@#`
2. Check email (should have Navy & Gold colors)
3. Click confirmation link
4. Should redirect to `/conversations` within 10 seconds
5. ✅ PASS / ❌ FAIL: __________

**Test 2: Admin Confirmation**
1. Go to Admin Panel → Users
2. Find unconfirmed user
3. Click "Confirm Email"
4. Should see success toast
5. Refresh → checkmark appears
6. ✅ PASS / ❌ FAIL: __________

**Test 3: Protected Route Guard**
1. Sign up without confirming: `test+guard@example.com`
2. Try to access `/dashboard` directly
3. Should redirect to `/auth?error=email_not_confirmed`
4. Should show unconfirmed alert
5. ✅ PASS / ❌ FAIL: __________

---

### Full Test (15 minutes)

**Run all tests in `EMAIL_CONFIRMATION_TEST_PLAN.md`**

Priority tests:
- [ ] Test Case 1: Normal flow
- [ ] Test Case 2: Slow network (Slow 3G)
- [ ] Test Case 3: Admin confirmation
- [ ] Test Case 4: Protected route guard
- [ ] Test Case 7: Resend email
- [ ] Test Case 10: Email brand colors

---

## Monitoring (First 2 Hours)

### Dashboard Metrics to Watch

1. **Error Rate**: Should not spike
   - Location: Supabase → Logs → Edge Functions
   - Threshold: < 5% error rate

2. **Email Sending**: Should succeed
   - Location: Resend dashboard
   - Threshold: > 95% delivery rate

3. **User Sign-ups**: Should work normally
   - Location: Supabase → Authentication → Users
   - Threshold: Similar rate to previous days

4. **Support Tickets**: Should decrease
   - Location: Support inbox
   - Threshold: Fewer email confirmation issues

---

### Set Up Alerts

```bash
# Add monitoring script (optional)
watch -n 60 'curl -s https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/health | jq'
```

---

## Rollback Procedure

### If Issues Occur

**Quick Rollback (Frontend)**:
```bash
git revert 1ac0ed8
npm run build
# Deploy previous build
```

**Edge Function Rollback**:
```bash
# Revert admin-users
git checkout HEAD~1 supabase/functions/admin-users/index.ts
npx supabase functions deploy admin-users

# Revert send-confirmation-email
git checkout HEAD~1 supabase/functions/send-confirmation-email/index.ts
npx supabase functions deploy send-confirmation-email
```

**Disable ProtectedRoute Guard** (if blocking users):
```typescript
// In src/App.tsx, comment out email check
// if (!emailConfirmed && !isLegacyAccount) {
//   return <Navigate to="/auth?error=email_not_confirmed" replace />;
// }
```

---

## Success Criteria

### Must Pass (Go/No-Go)
- [x] Frontend deployed successfully
- [ ] Edge Functions deployed successfully
- [ ] Test Case 1 passes (normal flow)
- [ ] Test Case 3 passes (admin confirmation)
- [ ] No spike in error logs (first 15 minutes)

### Should Pass (Monitor)
- [ ] Test Case 2 passes (slow network)
- [ ] Test Case 4 passes (protected route)
- [ ] Email colors correct (Navy & Gold)
- [ ] No user complaints in first hour

---

## Communication Plan

### Team Notification

**Slack Message Template**:
```
📧 Email Confirmation Fix Deployed

✅ Fixed: "Email confirmed but system says it's not" bug
✅ Fixed: Admin email confirmation now works
✅ Added: Support for slower connections (45s timeout)
✅ Updated: Email branding to Navy & Gold

🔍 Monitoring: Next 2 hours
📊 Expected: -80% reduction in email confirmation support tickets

🚨 Rollback: Prepared and tested
📖 Docs: See EMAIL_CONFIRMATION_FIX_SUMMARY.md

Questions? Ping @engineering
```

### User-Facing Announcement (Optional)

**For Status Page / Twitter**:
```
We've deployed improvements to our email confirmation system:
✅ Better support for slower mobile connections
✅ Faster admin support for confirmation issues
✅ Updated email branding

If you experienced issues confirming your email, please try again!
```

---

## Known Issues & Workarounds

### Issue 1: Legacy Users Without Confirmation
**Impact**: Users created before 2024-01-01 may not have confirmed emails
**Mitigation**: Grace period exemption in ProtectedRoute
**Workaround**: Manually confirm via admin panel if reported

### Issue 2: Supabase CLI Authentication
**Impact**: CLI deployment may require re-authentication
**Mitigation**: Run `npx supabase login` before deployment
**Workaround**: Use Supabase dashboard to deploy functions manually

### Issue 3: Email Delivery Delays
**Impact**: Confirmation emails may take 1-2 minutes in some cases
**Mitigation**: Resend functionality available
**Workaround**: Check spam folder, wait 5 minutes, then resend

---

## Post-Deployment Tasks (Within 48 Hours)

- [ ] Monitor confirmation success rate
- [ ] Check support ticket volume (should decrease)
- [ ] Verify email branding in production
- [ ] Run performance analysis (Test Case 11)
- [ ] Update internal documentation
- [ ] Schedule retrospective meeting
- [ ] Archive this deployment checklist

---

## Sign-Off

**Deployed By**: ________________________

**Date/Time**: ________________________

**Environment**: Production

**Deployment Status**:
- [ ] ✅ SUCCESS - All tests passed
- [ ] ⚠️ PARTIAL - Some issues, monitoring
- [ ] ❌ ROLLED BACK - Critical issues found

**Issues Encountered**:
_________________________________________________________
_________________________________________________________

**Next Steps**:
_________________________________________________________
_________________________________________________________

---

## Emergency Contacts

**On-Call Engineer**: ________________________
**Email**: ________________________
**Phone**: ________________________

**Backup**: ________________________
**Email**: ________________________

**Supabase Support**: support@supabase.io
**Resend Support**: support@resend.com

---

## Quick Reference Links

- **Supabase Dashboard**: https://app.supabase.com/project/fskwutnoxbbflzqrphro
- **Admin Panel**: https://aiqueryhub.com/admin
- **Resend Dashboard**: https://resend.com/dashboard
- **Error Logs**: Supabase → Logs → Edge Functions
- **Full Documentation**: `EMAIL_CONFIRMATION_FIX_SUMMARY.md`
- **Test Plan**: `EMAIL_CONFIRMATION_TEST_PLAN.md`

---

## Version History

| Version | Date | Deployer | Status | Notes |
|---------|------|----------|--------|-------|
| 1.0 | 2026-01-28 | _____ | PENDING | Initial deployment |

---

**Last Updated**: 2026-01-28
**Document Owner**: Engineering Team
**Review Frequency**: After each deployment
