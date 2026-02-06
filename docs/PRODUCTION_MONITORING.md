# AI Query Hub - Production Monitoring Guide

**Project:** AI Query Hub (Living AI Assistant)
**Environment:** Production
**Supabase Project:** fskwutnoxbbflzqrphro.supabase.co
**Region:** ap-southeast-1
**Last Updated:** February 6, 2026

## Overview

This document outlines the comprehensive monitoring and observability strategy for the AI Query Hub Living AI Assistant in production. The system includes multiple monitoring layers to ensure high availability, performance, and cost optimization.

## Monitoring Architecture

### Core Services to Monitor

1. **Frontend Application (Netlify)**
   - Domain: https://aiqueryhub.com
   - Uptime and availability
   - Core Web Vitals performance
   - SSL certificate status

2. **Backend Services (Supabase)**
   - Database performance and health
   - Edge Functions execution
   - Authentication service
   - Real-time WebSocket connections
   - Storage API performance

3. **External Integrations**
   - AI Provider APIs (Claude, OpenRouter)
   - Telegram Bot API
   - Slack API
   - Google Drive API
   - Brave Search API

## Supabase Built-in Monitoring

### 1. Project Dashboard Reports

**Access:** https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/observability

**Key Reports to Monitor:**

#### Database Report
- **Memory usage**: Monitor RAM utilization (target: <80%)
- **CPU usage**: Track query performance (target: <70%)
- **Disk IOPS**: Monitor read/write operations
- **Database connections**: Track connection pool usage
- **Disk size**: Monitor storage growth trends

#### Edge Functions Report
- **Execution Status Codes**: Monitor error rates (target: <5% 4xx/5xx)
- **Execution Time**: Average function duration (target: <3s for AI queries)
- **Invocations by Region**: Geographic distribution analysis

#### API Gateway Report
- **Total Requests**: Overall API traffic patterns
- **Response Errors**: 4XX and 5XX error rates
- **Response Speed**: API response times (target: <200ms)
- **Network Traffic**: Data transfer monitoring
- **Top Routes**: Most accessed endpoints

#### Auth Report
- **Active Users**: Daily/monthly active user metrics
- **Sign In Attempts**: Authentication success rates
- **Auth Errors**: Authentication failure analysis

### 2. Real-time Monitoring

**Access:** https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/logs

#### Edge Function Logs
Monitor these critical functions:
- `ai-query`: Main AI chat handler
- `telegram-webhook`: Telegram bot integration
- `slack-webhook`: Slack integration
- `proactive-checkin`: Autonomous assistance system
- `search-memories`: Semantic memory search

#### Database Logs
- Query performance issues
- Connection pool exhaustion
- RLS policy violations
- Constraint violations

## Key Performance Indicators (KPIs)

### System Health KPIs
- **Uptime**: Target 99.9% (8.76 hours downtime/year)
- **Response Time**: 95th percentile <200ms for API calls
- **AI Query Response Time**: Average <3 seconds
- **Error Rate**: <1% for critical functions
- **Database Connection Pool**: <80% utilization

### Business KPIs
- **Daily Active Users (DAU)**
- **AI Queries per Day**
- **Proactive Check-in Success Rate**: >95%
- **User Session Duration**
- **Feature Adoption Rates**

### Cost Monitoring KPIs
- **AI API Costs**: Track Claude/OpenRouter usage
- **Supabase Resource Consumption**
- **Egress Bandwidth**: Monitor data transfer costs
- **Function Execution Minutes**

## Automated Monitoring Setup

### 1. Webhook Monitoring

Create monitoring endpoints to verify webhook functionality:

```bash
# Test Telegram webhook
curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/telegram-webhook \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: ${TELEGRAM_SECRET_TOKEN}" \
  -d '{"message": {"text": "/health"}}' \
  --max-time 10

# Test Slack webhook
curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/slack-webhook \
  -H "Content-Type: application/json" \
  -d '{"type": "url_verification", "challenge": "test"}' \
  --max-time 10

# Test AI query endpoint (requires valid auth token)
curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/ai-query \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query": "health check", "test_mode": true}' \
  --max-time 15
```

### 2. Database Health Checks

Monitor database performance with these queries:

```sql
-- Check active connections
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';

-- Monitor query performance
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check database size growth
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

### 3. Proactive Check-in Monitoring

Verify autonomous system functionality:

```sql
-- Monitor proactive check-in execution
SELECT
    executed_at,
    user_id,
    urgency_score,
    actions_taken,
    success
FROM proactive_checkins
WHERE executed_at > NOW() - INTERVAL '24 hours'
ORDER BY executed_at DESC;

-- Check autonomy session usage
SELECT
    user_id,
    session_start,
    session_end,
    actions_performed,
    user_confirmed
FROM autonomy_sessions
WHERE session_start > NOW() - INTERVAL '7 days'
ORDER BY session_start DESC;
```

## Alert Thresholds

### Critical Alerts (Immediate Response Required)

1. **Service Down**: Any core service unavailable for >2 minutes
2. **High Error Rate**: >5% error rate for >5 minutes
3. **Database Connections**: >90% connection pool utilization
4. **API Response Time**: >5 seconds average for >5 minutes
5. **Disk Space**: >85% database storage used

### Warning Alerts (Monitor Closely)

1. **Elevated Response Times**: >200ms average for >10 minutes
2. **AI API Rate Limiting**: Approaching provider limits
3. **Memory Usage**: >80% RAM utilization for >15 minutes
4. **Egress Bandwidth**: Approaching monthly limits
5. **Failed Authentication**: >10% auth failure rate

### Cost Alerts

1. **Monthly Spend**: >120% of projected budget
2. **AI API Costs**: >$50/day unexpected spike
3. **Supabase Overage**: Approaching plan limits

## Incident Response Procedures

### 1. Critical Service Outage

**Response Time:** <5 minutes

1. **Assess Impact**: Check Supabase dashboard for service status
2. **Check External Dependencies**: Verify Claude/OpenRouter API status
3. **Communication**: Update status page if user-facing
4. **Mitigation**:
   - Switch to fallback AI provider if needed
   - Scale compute resources if resource exhaustion
   - Contact Supabase support for infrastructure issues

### 2. Performance Degradation

**Response Time:** <15 minutes

1. **Identify Bottleneck**: Check database performance metrics
2. **Query Analysis**: Review slow query logs
3. **Resource Scaling**: Increase compute if needed
4. **Code Optimization**: Deploy hotfix if application issue

### 3. Security Incident

**Response Time:** <2 minutes

1. **Immediate Action**: Disable affected user accounts if needed
2. **Audit Trail**: Review audit_logs table for suspicious activity
3. **Access Control**: Verify RLS policies are functioning
4. **Communication**: Notify security stakeholders

## Monitoring Tools Integration

### 1. External Monitoring (Recommended)

Consider integrating these external tools for comprehensive monitoring:

- **Uptime Robot**: Frontend uptime monitoring
- **Sentry**: Error tracking and performance monitoring
- **Grafana Cloud**: Custom dashboards and alerting
- **PagerDuty**: Incident management and on-call scheduling

### 2. Custom Monitoring Script

Create automated monitoring script:

```bash
#!/bin/bash
# production-health-check.sh

SUPABASE_URL="https://fskwutnoxbbflzqrphro.supabase.co"
FRONTEND_URL="https://aiqueryhub.com"

# Check frontend
if ! curl -s --max-time 10 "$FRONTEND_URL" >/dev/null; then
    echo "CRITICAL: Frontend is down"
    exit 1
fi

# Check AI query endpoint
if ! curl -s --max-time 15 "$SUPABASE_URL/functions/v1/ai-query" >/dev/null; then
    echo "CRITICAL: AI Query endpoint is down"
    exit 1
fi

# Check webhook endpoints
if ! curl -s --max-time 10 "$SUPABASE_URL/functions/v1/telegram-webhook" >/dev/null; then
    echo "WARNING: Telegram webhook may be down"
fi

if ! curl -s --max-time 10 "$SUPABASE_URL/functions/v1/slack-webhook" >/dev/null; then
    echo "WARNING: Slack webhook may be down"
fi

echo "All services operational"
```

## Cost Monitoring and Optimization

### 1. Supabase Usage Monitoring

**Access:** https://supabase.com/dashboard/org/mjskdqkzndioftbffagv/usage

**Monitor:**
- **Compute Hours**: Database CPU usage
- **Egress Bandwidth**: Data transfer costs
- **Database Size**: Storage costs
- **Function Executions**: Serverless compute costs

### 2. AI Provider Cost Tracking

**Claude API (Primary):**
- Track token usage across model tiers
- Monitor cost per query trends
- Set up budget alerts in Anthropic Console

**OpenRouter (Fallback):**
- Monitor fallback activation frequency
- Track cost differential vs Claude
- Optimize model selection for cost/performance

### 3. Cost Optimization Strategies

- **Model Tier Optimization**: Use CHEAP tier for simple queries
- **Caching**: Implement response caching for repeated queries
- **Rate Limiting**: Prevent abuse and cost spikes
- **Regional Optimization**: Use closest regions for reduced egress

## Backup and Disaster Recovery

### 1. Automated Backups

**Database Backups:**
- Daily automated backups enabled via Supabase
- Point-in-time recovery available (Pro plan)
- Backup retention: 30 days

**Configuration Backups:**
- All Edge Functions code in Git repository
- Environment variables documented
- Database schema in migration files

### 2. Disaster Recovery Plan

**RTO (Recovery Time Objective):** 1 hour
**RPO (Recovery Point Objective):** 24 hours

**Recovery Steps:**
1. **Infrastructure**: Restore from Supabase backup
2. **Code Deployment**: Deploy from staging branch
3. **Configuration**: Restore environment variables
4. **Verification**: Run production health checks
5. **Communication**: Notify stakeholders of recovery

## Regular Maintenance Schedule

### Daily Tasks (Automated)
- Health check monitoring
- Cost usage review
- Error rate analysis
- Performance metrics collection

### Weekly Tasks
- Database performance review
- AI usage cost analysis
- Security audit log review
- Backup verification

### Monthly Tasks
- Capacity planning review
- Cost optimization analysis
- Security policy review
- Disaster recovery testing
- Performance baseline updates

## Contact Information

### On-Call Escalation
1. **Primary**: System Administrator
2. **Secondary**: Technical Lead
3. **Emergency**: Supabase Support

### External Support
- **Supabase Support**: support@supabase.com
- **Anthropic Support**: support@anthropic.com
- **Netlify Support**: support@netlify.com

---

## Quick Reference Links

- **Production Dashboard**: https://aiqueryhub.com
- **Supabase Project**: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro
- **Monitoring Reports**: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/observability
- **Function Logs**: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/functions
- **Usage Metrics**: https://supabase.com/dashboard/org/mjskdqkzndioftbffagv/usage
- **GitHub Repository**: https://github.com/Thabonel/drive-flow-ai-know

**Document Status:** Production Ready
**Next Review:** March 6, 2026