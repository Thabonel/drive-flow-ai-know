# AI Query Hub - Production Runbook

**System:** AI Query Hub (Living AI Assistant)
**Environment:** Production
**Last Updated:** February 6, 2026

## Quick Status Check

### System Health Overview
```bash
# Run this command for immediate health status
curl -s https://aiqueryhub.com >/dev/null && echo "✅ Frontend: UP" || echo "❌ Frontend: DOWN"
curl -s https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/ai-query >/dev/null && echo "✅ Backend: UP" || echo "❌ Backend: DOWN"
```

### Emergency Contact
- **System Administrator**: [Primary contact]
- **Technical Lead**: [Secondary contact]
- **Supabase Support**: support@supabase.com

## Daily Operations

### Morning Health Check (5 minutes)

1. **Frontend Verification**
   ```bash
   curl -I https://aiqueryhub.com
   # Should return HTTP/2 200
   ```

2. **Backend API Status**
   ```bash
   curl -X GET https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/ai-query \
     -H "Authorization: Bearer invalid_token" 2>/dev/null
   # Should return: {"code":401,"message":"Invalid JWT"}
   ```

3. **Database Connection Check**
   - Visit: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro
   - Verify "ACTIVE_HEALTHY" status indicator

4. **Review Overnight Errors**
   - Check: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/logs
   - Filter: Last 24 hours, Level: Error
   - Action: Investigate any critical errors

### Weekly Operations (30 minutes)

1. **Performance Review**
   - Check: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/observability
   - Review: Database CPU/Memory usage trends
   - Review: Edge Functions response times
   - Review: API Gateway error rates

2. **Cost Analysis**
   - Check: https://supabase.com/dashboard/org/mjskdqkzndioftbffagv/usage
   - Review: Current month spending vs budget
   - Review: AI API usage trends
   - Review: Egress bandwidth consumption

3. **Security Audit**
   ```sql
   SELECT * FROM audit_logs
   WHERE created_at > NOW() - INTERVAL '7 days'
   AND action_type IN ('auth_failure', 'security_violation', 'suspicious_activity')
   ORDER BY created_at DESC;
   ```

### Monthly Operations (2 hours)

1. **Capacity Planning**
   - Review database size growth trends
   - Plan compute scaling needs
   - Review storage utilization patterns

2. **Backup Verification**
   - Verify automated backups are running
   - Test restore procedure (staging environment)
   - Update backup retention policies if needed

3. **Security Review**
   - Review and rotate API keys if needed
   - Check SSL certificate expiration dates
   - Review user access patterns

## Common Issues and Solutions

### 1. High Response Times

**Symptoms**: API responses >3 seconds, user complaints about slowness

**Investigation**:
```bash
# Check database performance
# Visit: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/observability
# Look at: Database CPU/Memory usage
```

**Solutions**:
- **Database Optimization**: Identify slow queries, add indexes
- **Compute Scaling**: Upgrade database compute size
- **Caching**: Implement query result caching
- **AI Provider**: Switch to faster model tier if AI queries are slow

### 2. High Error Rates

**Symptoms**: >5% error rate in Edge Functions

**Investigation**:
```bash
# Check function logs
# Visit: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/functions
# Review error logs for specific functions
```

**Solutions**:
- **Authentication Issues**: Verify JWT token handling
- **Database Connection**: Check connection pool utilization
- **AI Provider**: Verify API keys and rate limits
- **External APIs**: Check third-party service status

### 3. Telegram/Slack Bot Not Responding

**Symptoms**: Users report bot is unresponsive

**Investigation**:
```bash
# Test webhook endpoints
curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/telegram-webhook \
  -H "Content-Type: application/json" \
  -d '{"message": {"text": "test"}}'

curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/slack-webhook \
  -H "Content-Type: application/json" \
  -d '{"type": "url_verification", "challenge": "test"}'
```

**Solutions**:
- **Webhook Configuration**: Verify webhook URLs in bot settings
- **Function Deployment**: Redeploy webhook functions
- **API Keys**: Verify bot tokens and secret tokens
- **Rate Limiting**: Check if hitting API rate limits

### 4. High AI Costs

**Symptoms**: AI API costs exceeding budget

**Investigation**:
- Check: https://supabase.com/dashboard/org/mjskdqkzndioftbffagv/usage
- Review: AI query patterns and model usage
- Analyze: High-cost queries and user behavior

**Solutions**:
- **Model Optimization**: Switch more queries to CHEAP/FAST models
- **Rate Limiting**: Implement per-user rate limits
- **Caching**: Cache common query responses
- **Query Optimization**: Reduce context size for AI queries

### 5. Database Connection Pool Exhaustion

**Symptoms**: "too many connections" errors, timeout errors

**Investigation**:
```sql
SELECT count(*) as active_connections, state
FROM pg_stat_activity
GROUP BY state;
```

**Solutions**:
- **Connection Management**: Review application connection handling
- **Pooling Configuration**: Optimize PgBouncer settings
- **Compute Scaling**: Upgrade to higher connection limits
- **Code Review**: Fix connection leaks in application code

## Emergency Procedures

### 1. Complete System Outage

**Response Time**: <5 minutes

**Steps**:
1. **Verify Outage**: Check multiple endpoints
2. **Check Supabase Status**: https://status.supabase.com
3. **Check Dependencies**: Verify Anthropic, OpenRouter, Netlify status
4. **Escalate**: Contact Supabase support if infrastructure issue
5. **Communication**: Update users via status page
6. **Documentation**: Log incident details for post-mortem

### 2. Security Incident

**Response Time**: <2 minutes

**Steps**:
1. **Immediate Assessment**: Identify scope of compromise
2. **Access Control**: Disable compromised accounts/tokens
3. **Evidence Preservation**: Capture logs before cleanup
4. **Containment**: Block malicious IP addresses
5. **Communication**: Notify security stakeholders
6. **Recovery**: Restore from clean backups if needed

### 3. Data Loss Event

**Response Time**: <10 minutes

**Steps**:
1. **Stop Further Damage**: Identify and stop destructive process
2. **Assess Scope**: Determine what data is affected
3. **Recovery Plan**: Identify restore options (backups, replication)
4. **Execute Recovery**: Restore from most recent clean backup
5. **Verification**: Verify data integrity after restore
6. **Communication**: Notify users of any data impact

## Deployment Procedures

### 1. Code Deployment

**Production Deploy Checklist**:
- [ ] All tests passing in staging
- [ ] Code review approved
- [ ] Database migrations tested
- [ ] Environment variables verified
- [ ] Backup created before deploy
- [ ] Rollback plan prepared

**Deploy Commands**:
```bash
# Frontend (automatic via Netlify)
git push origin main

# Edge Functions (manual)
npx supabase functions deploy ai-query
npx supabase functions deploy telegram-webhook
npx supabase functions deploy slack-webhook
# ... deploy other functions as needed

# Database migrations (careful!)
npx supabase db push --include-all
```

### 2. Emergency Rollback

**If deployment causes issues**:
```bash
# Rollback frontend
git revert HEAD
git push origin main

# Rollback functions
npx supabase functions deploy ai-query --ref previous-version

# Rollback database (EXTREME CAUTION)
# Use point-in-time recovery from Supabase dashboard
```

## Monitoring Commands

### Quick Health Script
```bash
#!/bin/bash
# save as: production-health.sh

echo "=== AI Query Hub Health Check ==="
echo "Date: $(date)"
echo ""

# Frontend check
if curl -s --max-time 10 https://aiqueryhub.com >/dev/null; then
    echo "✅ Frontend: UP"
else
    echo "❌ Frontend: DOWN"
fi

# Backend API check
if curl -s --max-time 10 https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/ai-query >/dev/null; then
    echo "✅ Backend API: UP"
else
    echo "❌ Backend API: DOWN"
fi

# Webhook checks
if curl -s --max-time 10 https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/telegram-webhook >/dev/null; then
    echo "✅ Telegram Webhook: UP"
else
    echo "⚠️  Telegram Webhook: DOWN"
fi

if curl -s --max-time 10 https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/slack-webhook >/dev/null; then
    echo "✅ Slack Webhook: UP"
else
    echo "⚠️  Slack Webhook: DOWN"
fi

echo ""
echo "=== End Health Check ==="
```

### Database Performance Check
```sql
-- Save as: performance-check.sql
-- Run weekly to monitor database health

-- Active connections
SELECT 'Active Connections' as metric, count(*) as value
FROM pg_stat_activity
WHERE state = 'active';

-- Database size
SELECT 'Database Size' as metric, pg_size_pretty(pg_database_size(current_database())) as value;

-- Top slow queries (past 24h)
SELECT
    'Slow Queries' as metric,
    query,
    calls,
    total_exec_time,
    mean_exec_time
FROM pg_stat_statements
WHERE calls > 10
ORDER BY mean_exec_time DESC
LIMIT 5;

-- RLS policy violations (check audit logs)
SELECT 'RLS Violations' as metric, count(*) as value
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
AND action_type = 'rls_violation';
```

## Key URLs Reference

### Dashboards
- **Production Site**: https://aiqueryhub.com
- **Supabase Project**: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro
- **Observability**: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/observability
- **Function Logs**: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/functions
- **Database**: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/editor
- **Usage/Billing**: https://supabase.com/dashboard/org/mjskdqkzndioftbffagv/usage

### External Services
- **GitHub Repository**: https://github.com/Thabonel/drive-flow-ai-know
- **Netlify Dashboard**: https://app.netlify.com
- **Anthropic Console**: https://console.anthropic.com
- **OpenRouter Dashboard**: https://openrouter.ai

### Status Pages
- **Supabase Status**: https://status.supabase.com
- **Anthropic Status**: https://status.anthropic.com
- **Netlify Status**: https://www.netlifystatus.com

## Escalation Matrix

| Issue Severity | Response Time | Escalation |
|---------------|---------------|------------|
| Critical (System Down) | 5 minutes | Immediate: System Admin + Technical Lead |
| High (Performance Issues) | 15 minutes | 30 min: Technical Lead, 1hr: System Admin |
| Medium (Feature Issues) | 2 hours | Next business day: Technical Lead |
| Low (Minor Bugs) | 24 hours | Weekly review |

---

**Document Version**: 1.0
**Last Review**: February 6, 2026
**Next Review**: March 6, 2026
**Owner**: System Administrator