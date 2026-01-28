# AI Query Hub Documentation Index

Welcome to the AI Query Hub documentation! This index will help you find the information you need quickly.

---

## 📖 Getting Started

### New to AI Query Hub?
Start here:
1. **[AI Query Hub Overview](AI_QUERY_HUB_OVERVIEW.md)** ⭐
   - Complete platform overview
   - Architecture, features, use cases
   - Technology stack
   - Best starting point for new team members

2. **[Project Instructions (CLAUDE.md)](../CLAUDE.md)**
   - For AI assistants and developers
   - Development personality and workflows
   - Code standards and patterns
   - Ralph Loop protocol

3. **[Quick Start Guide](BIBLE/01-GETTING-STARTED/)** (Coming Soon)
   - 5-minute setup guide
   - First query walkthrough
   - Common workflows

---

## 🏗️ Architecture & Technical

### System Design
- **[Architecture Overview](AI_QUERY_HUB_OVERVIEW.md#architecture-overview)** - High-level system architecture
- **[Technology Stack](AI_QUERY_HUB_OVERVIEW.md#technology-stack)** - Frontend, backend, AI integration
- **[Data Flow](AI_QUERY_HUB_OVERVIEW.md#data-flow)** - Query and agent processing flows

### Database
- **[Schema Documentation](BIBLE/02-ARCHITECTURE/)** (Coming Soon)
- **[RLS Policies](BIBLE/05-SECURITY/)** (Coming Soon)
- **[Migration Guide](BIBLE/02-ARCHITECTURE/)** (Coming Soon)

---

## 🚀 Features

### Core Features
- **[Document Management](AI_QUERY_HUB_OVERVIEW.md#1-document-management-)** - Google Drive sync, processing, viewing
- **[Knowledge Bases](AI_QUERY_HUB_OVERVIEW.md#2-knowledge-bases-)** - Creation, organization, team collaboration
- **[AI Conversations](AI_QUERY_HUB_OVERVIEW.md#3-ai-powered-conversations-)** - Natural language queries, RAG
- **[Autonomous Agents](AI_QUERY_HUB_OVERVIEW.md#4-autonomous-agent-system-)** - Calendar, briefing, analysis, creative

### User Guides
- **[User Workflows](AI_QUERY_HUB_OVERVIEW.md#user-workflows)** - Common usage patterns
- **[Agent System Guide](BIBLE/03-FEATURES/)** (Coming Soon)
- **[Team Collaboration](BIBLE/03-FEATURES/)** (Coming Soon)

---

## 🔒 Security

### Authentication & Authorization
- **[Email Confirmation System](BIBLE/05-SECURITY/EMAIL_CONFIRMATION.md)** ⭐
  - Complete email confirmation flow
  - Spam prevention measures
  - SMTP configuration
  - Troubleshooting guide

- **[Security Overview](AI_QUERY_HUB_OVERVIEW.md#security--privacy)**
  - Authentication methods
  - Row-Level Security (RLS)
  - Data privacy
  - Compliance (GDPR, SOC 2)

---

## 🎨 Design

### Design System
- **[Design System Documentation](BIBLE/09-REFERENCE/DESIGN_SYSTEM.md)** ⭐
  - Neumorphic design principles
  - Color schemes (6 themes)
  - Shadow system
  - Component guidelines

- **[Design Overview](AI_QUERY_HUB_OVERVIEW.md#design-system)**
  - Quick reference
  - Core principles
  - Typography and colors

---

## 🤖 AI & Models

### AI Integration
- **[AI Integration Guide](AI_QUERY_HUB_OVERVIEW.md#ai-integration--intelligence)**
  - Model selection strategy
  - RAG implementation
  - Tool use (web search)

- **[Model Configuration](BIBLE/09-REFERENCE/)** (Coming Soon)
  - Centralized model IDs
  - Environment variables
  - Changing models

---

## 📦 Deployment

### Production Deployment
- **[Deployment Guide](BIBLE/06-DEPLOYMENT/)** (Coming Soon)
  - Frontend deployment (Vercel/Netlify)
  - Backend deployment (Supabase)
  - Environment variables
  - Monitoring setup

### Recent Deployments
- **[Email Confirmation Fix](BIBLE/05-SECURITY/EMAIL_CONFIRMATION.md)** (Deployed: Jan 2026)
- **[Duplicate Task Execution Fix](../DEPLOYMENT_READY.md)** (Ready: Jan 28, 2026)

---

## 🛠️ Development

### For Developers
- **[Development Setup](AI_QUERY_HUB_OVERVIEW.md#getting-started)**
  - Prerequisites
  - Local development
  - Key files to review

- **[Code Standards](../CLAUDE.md#code-simplification)**
  - Ralph Loop protocol
  - Protected patterns
  - Code simplification agent

- **[Contributing Guide](BIBLE/08-CONTRIBUTING/)** (Coming Soon)
  - Git workflow
  - Pull request process
  - Coding standards

---

## 🔧 Troubleshooting

### Common Issues
- **[Troubleshooting Guide](BIBLE/07-TROUBLESHOOTING/)** (Coming Soon)
  - Connection issues
  - Authentication problems
  - Edge function errors
  - Database issues

### Recent Fixes
- **[Email Confirmation Issues](BIBLE/05-SECURITY/EMAIL_CONFIRMATION.md#troubleshooting)**
  - Race condition fix
  - Admin API bug
  - Spam folder issues

---

## 📚 Reference

### API Reference
- **[Edge Functions API](BIBLE/04-API/)** (Coming Soon)
  - ai-query endpoint
  - agent-translate endpoint
  - agent-orchestrator endpoint
  - Sub-agent endpoints

### Constants & Configuration
- **[Model Constants](BIBLE/09-REFERENCE/)** (Coming Soon)
  - CLAUDE_MODELS
  - Provider configuration

- **[Design Tokens](BIBLE/09-REFERENCE/DESIGN_SYSTEM.md)**
  - Color variables
  - Shadow definitions
  - Spacing scale

---

## 🗺️ Roadmap

### Future Plans
- **[Product Roadmap](AI_QUERY_HUB_OVERVIEW.md#future-roadmap)**
  - Q1 2026: Advanced search, knowledge graphs
  - Q2 2026: Mobile app, enterprise features
  - Q3 2026: API, agent marketplace

---

## 📞 Support

### Getting Help
- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: You're reading it!
- **Email**: support@aiqueryhub.com (planned)
- **Community**: Discord (planned)

---

## 🗂️ Documentation Structure

```
docs/
├── INDEX.md                           # This file - documentation index
├── AI_QUERY_HUB_OVERVIEW.md          # Complete platform overview ⭐
│
├── BIBLE/                             # Comprehensive documentation
│   ├── 01-GETTING-STARTED/           # Setup and quickstart guides
│   ├── 02-ARCHITECTURE/              # System architecture
│   ├── 03-FEATURES/                  # Feature documentation
│   ├── 04-API/                       # API reference
│   ├── 05-SECURITY/                  # Security practices
│   │   └── EMAIL_CONFIRMATION.md     # Email confirmation system ⭐
│   ├── 06-DEPLOYMENT/                # Deployment guides
│   ├── 07-TROUBLESHOOTING/           # Common issues
│   ├── 08-CONTRIBUTING/              # Contribution guidelines
│   └── 09-REFERENCE/                 # Reference materials
│       └── DESIGN_SYSTEM.md          # Design system docs ⭐
│
../CLAUDE.md                           # Project instructions (root)
../DEPLOYMENT_READY.md                 # Latest deployment status
../README.md                           # Quick start (root)
```

---

## 🎯 Quick Links by Role

### For Users
1. [What is AI Query Hub?](AI_QUERY_HUB_OVERVIEW.md#what-is-ai-query-hub)
2. [Core Features](AI_QUERY_HUB_OVERVIEW.md#core-features)
3. [Getting Started Guide](AI_QUERY_HUB_OVERVIEW.md#for-users)
4. [User Workflows](AI_QUERY_HUB_OVERVIEW.md#user-workflows)

### For Developers
1. [Architecture Overview](AI_QUERY_HUB_OVERVIEW.md#architecture-overview)
2. [Technology Stack](AI_QUERY_HUB_OVERVIEW.md#technology-stack)
3. [Key Components](AI_QUERY_HUB_OVERVIEW.md#key-components)
4. [Development Setup](AI_QUERY_HUB_OVERVIEW.md#for-developers)
5. [CLAUDE.md](../CLAUDE.md) - Development guide

### For Designers
1. [Design System](BIBLE/09-REFERENCE/DESIGN_SYSTEM.md)
2. [Design Philosophy](AI_QUERY_HUB_OVERVIEW.md#design-system)
3. [Color Schemes](AI_QUERY_HUB_OVERVIEW.md#color-scheme)
4. [Component Guidelines](BIBLE/09-REFERENCE/DESIGN_SYSTEM.md)

### For Product Managers
1. [Executive Summary](AI_QUERY_HUB_OVERVIEW.md#executive-summary)
2. [User Personas](AI_QUERY_HUB_OVERVIEW.md#user-personas--use-cases)
3. [Core Features](AI_QUERY_HUB_OVERVIEW.md#core-features)
4. [Future Roadmap](AI_QUERY_HUB_OVERVIEW.md#future-roadmap)

### For DevOps
1. [Deployment Guide](BIBLE/06-DEPLOYMENT/)
2. [Infrastructure](AI_QUERY_HUB_OVERVIEW.md#deployment--infrastructure)
3. [Monitoring](AI_QUERY_HUB_OVERVIEW.md#monitoring)
4. [Recent Deployments](../DEPLOYMENT_READY.md)

---

## 📝 Documentation Status

| Section | Status | Last Updated |
|---------|--------|--------------|
| Overview | ✅ Complete | Jan 28, 2026 |
| Architecture | ✅ Complete | Jan 28, 2026 |
| Features | ✅ Complete | Jan 28, 2026 |
| Security | 🟡 Partial | Jan 2026 |
| Design System | ✅ Complete | Dec 2024 |
| API Reference | ⏳ Planned | Q1 2026 |
| Troubleshooting | ⏳ Planned | Q1 2026 |
| Contributing | ⏳ Planned | Q1 2026 |

**Legend**:
- ✅ Complete and up-to-date
- 🟡 Partially complete
- ⏳ Planned/In progress
- ❌ Outdated (needs update)

---

## 🔄 Recent Updates

### January 28, 2026
- ✅ Created comprehensive platform overview
- ✅ Added documentation index (this file)
- ✅ Documented duplicate task execution fix

### January 2026
- ✅ Email confirmation system documentation
- ✅ Deployment guide for email fix

### December 2024
- ✅ Neumorphic design system documentation
- ✅ Added 6 theme variants

---

## 💡 Contributing to Documentation

Found an error or want to improve the docs?

1. **Small fixes**: Edit directly and submit PR
2. **New sections**: Create issue first to discuss
3. **Examples**: Code examples are always welcome
4. **Screenshots**: Add to `docs/images/` folder

**Style Guide**:
- Use Markdown
- Add table of contents for long docs
- Include code examples where relevant
- Use emojis sparingly (section headers only)
- Link to related docs liberally

---

**Last Updated**: January 28, 2026
**Maintained By**: AI Query Hub Documentation Team

🚀 Happy building with AI Query Hub!
