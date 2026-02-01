# Vendor Data Processing Agreements

**Status:** Active
**Last Updated:** February 1, 2026
**Owner:** Legal & Compliance Team
**Review Cycle:** Quarterly

---

## Executive Summary

This document tracks all Data Processing Agreements (DPAs) and vendor compliance status for AI Query Hub's third-party services that process personal data. All vendors listed below are GDPR/CCPA compliant and have executed appropriate data processing agreements.

## Critical Vendor DPAs

### 1. Supabase (Database & Authentication)
- **Service**: Database, authentication, real-time subscriptions
- **Data Processed**: User accounts, documents, query history, authentication tokens
- **DPA Status**: ✅ **SIGNED** - Standard DPA under Supabase Terms
- **DPA Location**: https://supabase.com/privacy
- **Compliance**: GDPR, CCPA, SOC 2 Type II
- **Data Location**: US-West (Oregon), EU options available
- **Backup/DR**: Automated daily backups, 7-day retention
- **Breach Notification**: 24-hour commitment
- **Last Review**: February 1, 2026
- **Next Review**: May 1, 2026

### 2. Anthropic (Claude AI Services)
- **Service**: Primary AI language model (Claude Opus 4.5, Sonnet, Haiku)
- **Data Processed**: User queries, document content for analysis, AI responses
- **DPA Status**: ✅ **SIGNED** - Anthropic Business DPA
- **DPA Location**: https://www.anthropic.com/privacy
- **Compliance**: GDPR, CCPA, SOC 2 Type II
- **Data Retention**: Zero data retention (queries not used for training)
- **Data Location**: US-East
- **Encryption**: TLS 1.3 in transit, AES-256 at rest
- **Breach Notification**: 72-hour commitment
- **Last Review**: February 1, 2026
- **Next Review**: May 1, 2026

### 3. Google (Drive Integration & OAuth)
- **Service**: Google Drive API, Google Sheets API, OAuth 2.0
- **Data Processed**: OAuth tokens, Drive file metadata, document content
- **DPA Status**: ✅ **SIGNED** - Google Cloud Data Processing Amendment
- **DPA Location**: https://cloud.google.com/terms/data-processing-addendum
- **Compliance**: GDPR, CCPA, ISO 27001, SOC 2
- **Data Location**: User-selected region (default: US)
- **Token Storage**: Encrypted in Supabase (user_google_tokens table)
- **Scope**: Read-only access to user-authorized files
- **Breach Notification**: 72-hour commitment
- **Last Review**: February 1, 2026
- **Next Review**: May 1, 2026

### 4. Resend (Email Services)
- **Service**: Transactional email delivery (verification, notifications)
- **Data Processed**: Email addresses, delivery metadata, email content
- **DPA Status**: ✅ **SIGNED** - Resend Standard DPA
- **DPA Location**: https://resend.com/legal/dpa
- **Compliance**: GDPR, CCPA
- **Data Retention**: 90 days (delivery logs), immediate deletion for content
- **Data Location**: US-East, EU options available
- **SMTP**: smtp.resend.com with TLS encryption
- **Breach Notification**: 48-hour commitment
- **Last Review**: February 1, 2026
- **Next Review**: May 1, 2026

## Secondary Vendor DPAs

### 5. OpenRouter (AI Fallback Services)
- **Service**: Fallback AI models (GPT-4o, other LLMs)
- **Data Processed**: User queries when Anthropic unavailable
- **DPA Status**: ✅ **SIGNED** - OpenRouter Enterprise Agreement
- **DPA Location**: https://openrouter.ai/privacy
- **Compliance**: GDPR, CCPA
- **Data Retention**: 30 days maximum
- **Usage**: Fallback only (< 5% of traffic)
- **Encryption**: End-to-end encryption
- **Breach Notification**: 72-hour commitment
- **Last Review**: February 1, 2026
- **Next Review**: May 1, 2026

### 6. Brave Search (Web Search API)
- **Service**: Web search capabilities for Claude AI
- **Data Processed**: Search queries (anonymized), search results
- **DPA Status**: ✅ **SIGNED** - Brave Search Enterprise DPA
- **DPA Location**: https://search.brave.com/help/privacy-policy
- **Compliance**: GDPR, CCPA
- **Data Retention**: 24 hours (search logs)
- **Anonymization**: User identifiers stripped before processing
- **Usage**: AI tool use only (context enhancement)
- **Breach Notification**: 48-hour commitment
- **Last Review**: February 1, 2026
- **Next Review**: May 1, 2026

### 7. Netlify (Static Hosting)
- **Service**: Frontend hosting and CDN
- **Data Processed**: IP addresses, request logs, static assets
- **DPA Status**: ✅ **SIGNED** - Netlify Business DPA
- **DPA Location**: https://www.netlify.com/gdpr/
- **Compliance**: GDPR, CCPA, SOC 2
- **Data Retention**: 90 days (access logs)
- **Data Location**: Global CDN (user-selected region preference)
- **Analytics**: Anonymized usage statistics only
- **Breach Notification**: 72-hour commitment
- **Last Review**: February 1, 2026
- **Next Review**: May 1, 2026

## Development & Analytics Vendors

### 8. Vercel (Development Preview Hosting)
- **Service**: Development environment hosting (non-production)
- **Data Processed**: Development data, preview deployment logs
- **DPA Status**: ✅ **SIGNED** - Vercel Enterprise DPA
- **DPA Location**: https://vercel.com/legal/privacy-policy
- **Compliance**: GDPR, CCPA
- **Data Type**: Test data only (no production PII)
- **Usage**: Development/staging environments
- **Data Retention**: 30 days
- **Last Review**: February 1, 2026
- **Next Review**: May 1, 2026

### 9. GitHub (Code Repository)
- **Service**: Source code hosting, CI/CD
- **Data Processed**: Code repository, commit history, secrets (encrypted)
- **DPA Status**: ✅ **SIGNED** - GitHub Enterprise DPA
- **DPA Location**: https://docs.github.com/en/github/site-policy/github-data-protection-agreement
- **Compliance**: GDPR, CCPA, SOC 2
- **Data Type**: Source code, configuration (no user PII)
- **Security**: Private repository, encrypted secrets
- **Data Retention**: Indefinite (code history)
- **Last Review**: February 1, 2026
- **Next Review**: May 1, 2026

## Compliance Monitoring

### DPA Requirements Checklist

All vendors must meet these minimum requirements:

- ✅ **GDPR Article 28 Compliance**: Processor obligations implemented
- ✅ **Data Subject Rights**: Support for access, rectification, deletion
- ✅ **Security Measures**: Encryption at rest and in transit
- ✅ **Sub-processor Notification**: 30-day notice for changes
- ✅ **Audit Rights**: Annual compliance reports or audit access
- ✅ **Breach Notification**: 72-hour maximum notification
- ✅ **Data Location Transparency**: Clear data residency policies
- ✅ **Retention Limits**: Defined data retention and deletion procedures

### Risk Assessment Matrix

| Vendor | Data Sensitivity | Volume | Compliance Score | Risk Level |
|--------|------------------|--------|------------------|------------|
| Supabase | High | High | A+ | Medium |
| Anthropic | High | High | A+ | Low |
| Google | Medium | Medium | A+ | Low |
| Resend | Low | Low | A | Low |
| OpenRouter | High | Low | A | Low |
| Brave Search | Low | Low | A | Low |
| Netlify | Low | High | A+ | Low |

**Risk Levels:**
- **Low**: Vendor meets all requirements, established track record
- **Medium**: High data sensitivity requires enhanced monitoring
- **High**: Immediate attention required (none currently)

## Data Flow Documentation

### Primary Data Processing Flow
1. **User Data Entry** → Supabase (encrypted storage)
2. **AI Processing** → Anthropic Claude (zero retention)
3. **Fallback Processing** → OpenRouter (30-day retention)
4. **Email Communications** → Resend (90-day logs)
5. **File Integration** → Google APIs (token-based access)

### Data Residency Options
- **US Users**: Default US-based processing
- **EU Users**: EU-based Supabase regions available
- **Global**: CDN serving via Netlify (region-aware)

## Incident Response Procedures

### Breach Notification Timeline
1. **0-24 hours**: Vendor notifies AI Query Hub
2. **24-48 hours**: Internal assessment and impact analysis
3. **48-72 hours**: Regulatory notification if required (GDPR Article 33)
4. **72+ hours**: User notification if high risk (GDPR Article 34)

### Escalation Matrix
- **Data Controller**: AI Query Hub (primary responsibility)
- **Legal Contact**: legal@aiqueryhub.com
- **Technical Contact**: security@aiqueryhub.com
- **Compliance Officer**: compliance@aiqueryhub.com

## Audit & Review Schedule

### Quarterly Reviews (Next: May 1, 2026)
- DPA status verification
- Vendor compliance updates
- Risk assessment refresh
- New vendor additions

### Annual Activities (Next: February 1, 2027)
- Comprehensive vendor audit
- DPA renewal negotiations
- Compliance framework updates
- Security assessment reviews

### Continuous Monitoring
- Vendor security notifications (immediate)
- Privacy policy changes (30-day review)
- New service integrations (pre-deployment DPA)
- Regulatory updates (quarterly legal review)

---

## Contact Information

**Legal & Privacy Team**
- Email: legal@aiqueryhub.com
- DPO: privacy@aiqueryhub.com
- Phone: +1-XXX-XXX-XXXX

**Technical Contacts**
- Security: security@aiqueryhub.com
- DevOps: ops@aiqueryhub.com

**Regulatory Affairs**
- GDPR Representative (EU): gdpr@aiqueryhub.com
- CCPA Contact (US): ccpa@aiqueryhub.com

---

*This document is reviewed quarterly and updated as needed to reflect current vendor relationships and compliance status. All DPAs are stored securely and available for audit upon request.*