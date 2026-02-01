# PRD: 3-2-1 Attention System for Timeline/Calendar

**Document Version:** 1.0
**Last Updated:** February 1, 2026
**Owner:** Product Team
**Status:** Draft

## Executive Summary

Transform the existing timeline/calendar from a passive scheduling tool into an **attention-first planning system** that helps users optimize for focus, delegation, and role-specific productivity. This system implements the "3-2-1 attention method" directly into the calendar interface, making it actionable rather than just advice.

## Problem Statement

Current calendar apps focus on **time-blocking** rather than **attention optimization**. Users schedule meetings without considering:
- Context switching costs
- Role-appropriate activities
- Attention budget limits
- Delegation opportunities
- Focus protection

This leads to fragmented days, decision fatigue, and suboptimal productivity patterns.

## Solution Overview

Implement a **role-aware, attention-optimized calendar system** that:
1. Adapts scheduling behavior based on user's current role
2. Protects high-value focus time
3. Streamlines delegation workflows
4. Provides attention budget management
5. Guides weekly planning with AI assistance

## Core Features

### 1. Role + Zone + Non-Negotiable Planning Layer

#### 1.1 Role Mode Selector
**Objective:** Calendar behavior adapts based on user's primary role for the week/day

**Role Types:**
- **Maker Mode** - Deep work and output creation
  - Default templates: "Deep Work Block", "Build/Ship", "Solo Output"
  - Rules: Fewer meetings, longer blocks, hard caps on context switching
  - Focus protection: Auto-warns when meetings fragment >2hr blocks

- **Marker Mode** - Review, feedback, and decision-making
  - Templates: "Review Queue", "Feedback Sprint", "Decision Window", "1:1"
  - Rules: Meeting clusters, short decision blocks, delegate prompts
  - Decision batching: Groups similar decision-type events

- **Multiplier Mode** - Routing, alignment, and team acceleration
  - Templates: "Alignment Block", "Hiring/Recruiting", "Strategy Bet", "Unblock Others"
  - Rules: More short blocks, routing time, relationship time
  - Delegation optimization: Auto-suggests handoff opportunities

**UI Implementation:**
- Role badge at calendar header
- Role-specific event templates in quick-add
- Color coding by role type
- Role transition warnings when switching mid-week

#### 1.2 Zone Mode Toggle
**Objective:** Adjust planning aggressiveness based on business context

**Zone Types:**
- **Wartime** - High intensity, execution focus
  - Harder limits on optional meetings
  - More hands-on blocks
  - Auto-prompts to shorten/kill low-leverage events
  - Shortened feedback cycles

- **Peacetime** - Growth, learning, and strategic planning
  - More recovery/creative space
  - More delegation time
  - More learning/reflection blocks
  - Longer-term thinking blocks

**UI Implementation:**
- Toggle switch in calendar header
- Zone-appropriate scheduling suggestions
- Different default durations by zone
- Automatic template adjustments

#### 1.3 The One Non-Negotiable
**Objective:** Ensure highest-priority work gets protected calendar time

**Features:**
- Single pinned priority with required weekly minimum hours
- First claim on prime hours (user-defined peak times)
- Automatic scheduling conflict warnings
- Progress tracking toward weekly minimum
- "Trade-off alerts" when non-negotiable gets squeezed

**UI Implementation:**
- Prominent non-negotiable widget in sidebar
- Protected time blocks (different visual styling)
- Weekly progress bar
- Conflict resolution prompts

### 2. Attention-First Scheduling

#### 2.1 Attention Tags per Event
**Objective:** Track and optimize attention patterns rather than just time

**Attention Types:**
- **Create** - Deep work, building, writing
- **Decide** - Choices, approvals, strategic thinking
- **Connect** - Relationships, alignment, communication
- **Review** - Evaluation, feedback, quality control
- **Recover** - Rest, learning, reflection

**Attention Budget Rules:**
- Max 2 "Decide" blocks per day
- No more than 3 context switches in morning
- At least 1 "Recover" block per day in peacetime
- "Create" blocks require 90+ minute minimum

**UI Implementation:**
- Attention type selector in event creation
- Daily attention budget dashboard
- Color coding by attention type
- Budget warning notifications

#### 2.2 Context-Switch Cost Warnings
**Objective:** Prevent calendar fragmentation through smart warnings

**Warning Triggers:**
- Meeting between two deep work blocks
- >3 different attention types in 4-hour window
- <30 minutes between conflicting attention types
- Back-to-back "Decide" events

**UI Implementation:**
- Warning modals with specific fragmentation costs
- "Keep or move?" quick actions
- Alternative time suggestions
- Context-switch counter in daily view

### 3. Delegation + Trust Management

#### 3.1 Delegate Workflow
**Objective:** Convert calendar events into proper delegation with follow-up

**Delegation Levels:**
- **New** - "Work alongside" session required
- **Experienced** - "Review steps/give clarity" checkpoint
- **Expert** - "Unblock/provide context" short sync

**Workflow:**
1. "Delegate" button on any task/event
2. Convert to: Owner + Trust Level + Review Schedule
3. Auto-create follow-up events based on trust level
4. Progress tracking and handoff completion

**UI Implementation:**
- Delegate button in event details
- Trust level selector with descriptions
- Automated follow-up scheduling
- Delegation dashboard with active handoffs

#### 3.2 Router Inbox (Multiplier Mode)
**Objective:** Streamline incoming requests and decision routing

**Triage Options:**
- Route to teammate (with context)
- Convert into meeting
- Convert into async note
- Decline with reasoning

**Features:**
- Request categorization
- Routing templates
- Response time tracking
- Team workload visibility

**UI Implementation:**
- Inbox widget in Multiplier mode
- Quick triage buttons
- Routing history
- Team capacity indicators

### 4. Weekly Calibration Ritual

#### 4.1 Weekly Planning Wizard
**Objective:** 10-minute guided setup for optimal week structure

**Calibration Flow:**
1. **Role Selection** - Primary role for the week
2. **Zone Selection** - Wartime vs Peacetime context
3. **Non-Negotiable Definition** - One key priority
4. **Auto-Generation** - Draft week with role-optimized blocks
5. **Role Fit Score** - Compatibility assessment

**Fit Score Algorithm:**
- Maker + 18 meetings = Low score
- Multiplier + 20 hours solo work = Low score
- Marker + No decision blocks = Low score

**UI Implementation:**
- Weekly wizard modal (Sunday evening/Monday morning)
- Role fit score with explanations
- One-click week generation
- Manual adjustment tools

### 5. AI-Powered Features

#### 5.1 "Rewrite My Week" Assistant
**Objective:** AI optimization based on role and constraints

**Capabilities:**
- Week reshuffling based on role rules
- Attention budget optimization
- Meeting clustering suggestions
- Focus time protection

**Input Examples:**
- "I'm in wartime + Maker mode; protect shipping time"
- "Multiplier week with 3 key hires to make"
- "Marker mode but traveling Tuesday-Wednesday"

#### 5.2 "Is This My Job?" Checker
**Objective:** Highlight events that violate role optimization

**Analysis:**
- Compare events against role expectations
- Flag delegation opportunities
- Suggest batch processing
- Identify elimination candidates

#### 5.3 Meeting Intelligence
**Objective:** Convert meetings into actionable follow-ups

**Features:**
- Meeting notes → next actions extraction
- Auto-scheduled review blocks
- Decision tracking and follow-up
- Action item assignment with delegation

## Technical Implementation

### Database Schema Changes

```sql
-- User role and zone preferences
CREATE TABLE user_calendar_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  current_role TEXT CHECK (current_role IN ('maker', 'marker', 'multiplier')),
  current_zone TEXT CHECK (current_zone IN ('wartime', 'peacetime')),
  non_negotiable_title TEXT,
  non_negotiable_weekly_hours INTEGER DEFAULT 5,
  peak_hours_start TIME DEFAULT '09:00',
  peak_hours_end TIME DEFAULT '12:00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced timeline items with attention tags
ALTER TABLE timeline_items ADD COLUMN attention_type TEXT
CHECK (attention_type IN ('create', 'decide', 'connect', 'review', 'recover'));

ALTER TABLE timeline_items ADD COLUMN is_non_negotiable BOOLEAN DEFAULT FALSE;

-- Delegation tracking
CREATE TABLE delegations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delegator_id UUID REFERENCES auth.users(id),
  delegate_id UUID REFERENCES auth.users(id),
  timeline_item_id UUID REFERENCES timeline_items(id),
  trust_level TEXT CHECK (trust_level IN ('new', 'experienced', 'expert')),
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Weekly calibration history
CREATE TABLE weekly_calibrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  week_start_date DATE,
  role_selected TEXT,
  zone_selected TEXT,
  non_negotiable TEXT,
  role_fit_score INTEGER CHECK (role_fit_score BETWEEN 0 AND 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Frontend Components

```typescript
// New components to create
components/
├── RoleZoneSelector.tsx       // Role + Zone header controls
├── NonNegotiableWidget.tsx    // Pinned priority tracking
├── AttentionBudget.tsx        // Daily attention dashboard
├── DelegateButton.tsx         // Delegation workflow trigger
├── RouterInbox.tsx            // Multiplier mode request triage
├── WeeklyCalibration.tsx      // Planning wizard modal
├── AttentionWarning.tsx       // Context-switch alerts
├── RoleFitScore.tsx           // Weekly compatibility score
└── AIWeekRewriter.tsx         // AI optimization assistant
```

### API Endpoints

```typescript
// New API endpoints needed
POST /api/calendar/set-role-zone     // Update user role and zone
POST /api/calendar/delegate-item     // Create delegation
GET  /api/calendar/attention-budget  // Current attention usage
POST /api/calendar/calibrate-week    // Weekly planning
POST /api/ai/rewrite-week           // AI week optimization
GET  /api/calendar/fit-score        // Role compatibility analysis
```

## Success Metrics

### Primary KPIs
- **Focus Time Protected**: Hours of uninterrupted deep work per week
- **Context Switches**: Average daily attention type changes
- **Delegation Success Rate**: % of delegated tasks completed successfully
- **Role Fit Score**: Weekly average compatibility score
- **Non-Negotiable Achievement**: % of weeks hitting minimum hours

### User Engagement
- Weekly calibration completion rate
- AI rewrite feature usage
- Delegation workflow adoption
- Attention budget adherence

### Productivity Outcomes
- User-reported focus quality scores
- Task completion rates by attention type
- Meeting efficiency ratings
- Time-to-completion for delegated work

## Implementation Phases

### Phase 1: Core Attention System (4-6 weeks)
- Role/Zone selector implementation
- Attention tags on timeline items
- Non-negotiable tracking
- Basic context-switch warnings

### Phase 2: Delegation Workflows (3-4 weeks)
- Delegation button and flow
- Trust level management
- Router inbox for Multiplier mode
- Follow-up automation

### Phase 3: Weekly Calibration (3-4 weeks)
- Planning wizard implementation
- Role fit scoring algorithm
- Historical calibration tracking
- Template generation by role

### Phase 4: AI Enhancement (4-6 weeks)
- Week rewriting assistant
- "Is this my job?" analysis
- Meeting intelligence features
- Advanced optimization algorithms

## Risk Assessment

### Technical Risks
- **Database performance** with new attention tracking queries
- **Real-time updates** for collaborative calendars
- **AI accuracy** for week optimization suggestions

### User Adoption Risks
- **Complexity** of new system vs. simple time-blocking
- **Learning curve** for role-based thinking
- **Habit change** resistance from current calendar users

### Mitigation Strategies
- Gradual feature rollout with optional adoption
- Clear onboarding flow explaining benefits
- Analytics to measure actual productivity improvements
- Fallback to simple mode for resistant users

## Success Criteria

### Launch Readiness
- [ ] All Phase 1 features implemented and tested
- [ ] User onboarding flow completed
- [ ] Analytics tracking implemented
- [ ] Performance benchmarks met

### 30-Day Post-Launch
- [ ] >70% of active users complete weekly calibration
- [ ] >50% reduction in context switches for Maker mode users
- [ ] >80% user satisfaction with attention budget features
- [ ] Delegation feature used by >40% of Multiplier mode users

### 90-Day Success
- [ ] Measurable productivity improvements in user surveys
- [ ] High retention for users who complete calibration
- [ ] AI features show positive impact on planning quality
- [ ] Feature becomes primary calendar interaction method

## Appendix: User Stories

### Maker Mode User
*"As a developer in Maker mode, I want the calendar to protect my morning coding blocks so that I can ship features without constant interruptions."*

### Marker Mode User
*"As a manager in Marker mode, I want my decision-making meetings clustered together so that I can be in the right headspace and avoid decision fatigue."*

### Multiplier Mode User
*"As an executive in Multiplier mode, I want incoming requests automatically triaged so that I can route them efficiently without becoming a bottleneck."*

### Any Role User
*"As someone with one critical project, I want the calendar to protect time for my non-negotiable priority so that I make progress on what matters most."*

---

**Next Steps:**
1. Stakeholder review and approval
2. Technical architecture deep-dive
3. Design mockups and user flow mapping
4. Development sprint planning
5. Beta user recruitment for testing