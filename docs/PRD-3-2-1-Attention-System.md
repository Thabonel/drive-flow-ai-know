# PRD: 3-2-1 Attention System for AI Query Hub Timeline

**Document Version:** 1.0
**Date:** February 1, 2026
**Owner:** Product Team
**Status:** Ready for Implementation

---

## Executive Summary

Transform AI Query Hub's existing timeline/calendar from a passive scheduling tool into an **attention-first productivity system** that optimizes for focus, delegation, and role-specific effectiveness. This system implements the "3-2-1 attention method" as actionable features that guide users to protect their most valuable cognitive resources.

**Key Value Proposition:** Instead of just blocking time, users actively manage attention budgets, optimize for their current role (Maker/Marker/Multiplier), and receive intelligent guidance on when to delegate, cluster activities, or protect focus blocks.

**Expected Outcomes:**
- 30% reduction in context switching for Maker mode users
- 40% adoption of delegation features by Multiplier mode users
- 80% of users stay within daily attention budgets
- 70% complete weekly calibration flows

---

## Problem Statement

### Current Pain Points

**Time-blocking doesn't optimize for cognitive load:**
- Users schedule back-to-back meetings without considering attention drain
- No distinction between deep work and shallow tasks
- Context switching costs are invisible and unmanaged
- Important work gets fragmented by low-priority interruptions

**Role-specific needs are ignored:**
- Makers need protected focus time but get interrupted
- Markers need decision batching but scatter choices throughout the day
- Multipliers need delegation workflows but lack trust management tools

**Productivity advice stays theoretical:**
- Users read about attention management but have no system to implement it
- Calendar apps treat all events as equal priority
- No guidance on when to delegate, decline, or reschedule

### Market Gap

Existing calendar tools focus on **when** things happen, not **how they impact attention**. Users need a system that:
- Adapts behavior based on their current role and context
- Actively protects cognitive resources
- Provides delegation and trust management workflows
- Guides weekly planning with role-specific optimization

---

## Solution Overview

### Core Philosophy

**Attention-First Planning:** Every scheduling decision considers cognitive load, not just available time.

**Role-Adaptive Interface:** Calendar behavior changes based on whether you're in Maker (deep work), Marker (decisions), or Multiplier (routing) mode.

**Systematic Delegation:** Built-in workflows for converting personal tasks into managed team assignments with appropriate follow-up cadences.

### High-Level Feature Categories

1. **Role + Zone + Non-Negotiable Layer** - Foundational planning framework
2. **Attention Budget Management** - Cognitive load tracking and warnings
3. **Focus Protection System** - Fragmentation prevention and optimization
4. **Delegation Workflows** - Trust-based task assignment with follow-ups
5. **Weekly Calibration Ritual** - Guided planning with role fit optimization
6. **AI-Powered Optimization** - Intelligent schedule rewriting and suggestions

---

## Detailed Feature Specifications

### 1. Role + Zone + Non-Negotiable Planning Layer

#### 1.1 Role Mode Selector

**Objective:** Adapt calendar behavior based on user's primary cognitive work mode

**Role Definitions:**
- **Maker Mode** - Deep work, building, creating output
  - Protects focus blocks (2+ hour uninterrupted time)
  - Warns when meetings fragment creative work
  - Suggests longer default durations (90-120 min blocks)
  - Limits daily meetings to maximum of 3

- **Marker Mode** - Reviewing, deciding, providing feedback
  - Clusters decision-making events together
  - Limits "Decide" attention type to 2 blocks per day
  - Prompts for batch processing of similar decisions
  - Suggests 30-45 minute decision windows

- **Multiplier Mode** - Routing, aligning, unblocking others
  - Optimizes for shorter, more frequent interactions
  - Enables delegation workflows and request routing
  - Suggests 15-30 minute connection blocks
  - Prioritizes relationship and alignment time

**User Interface:**
- Role badge prominently displayed in timeline header
- Role selection affects event templates and duration suggestions
- Visual indicators throughout timeline reflect role-optimized scheduling
- Weekly role transition prompts with context-specific guidance

**Technical Implementation:**
```sql
ALTER TABLE user_attention_preferences ADD COLUMN current_role TEXT
  CHECK (current_role IN ('maker', 'marker', 'multiplier')) DEFAULT 'maker';
```

#### 1.2 Zone Mode Toggle

**Objective:** Adjust planning aggressiveness based on business context

**Zone Types:**
- **Wartime** - High intensity execution periods
  - Stricter limits on optional meetings (max 20% of time)
  - Auto-suggests shortening or canceling low-value events
  - Prioritizes hands-on work over strategic planning
  - Increases delegation prompts for non-essential tasks

- **Peacetime** - Growth and strategic planning periods
  - More time allocated for learning and reflection
  - Longer strategic planning blocks encouraged
  - More delegation time for team development
  - Recovery blocks automatically suggested

**User Interface:**
- Toggle switch next to role selector
- Zone-specific color coding and visual cues
- Different default templates based on zone context
- Automated suggestions adapt to zone selection

#### 1.3 The One Non-Negotiable

**Objective:** Ensure highest-priority work receives protected calendar time

**Core Features:**
- Single pinned priority with required weekly minimum hours (user-defined, default 5 hours)
- First claim on user's peak energy hours (configurable time range)
- Automatic conflict warnings when non-negotiable gets displaced
- Weekly progress tracking with completion forecasting
- "Trade-off alerts" when other commitments threaten the priority

**User Interface:**
- Prominent widget in timeline sidebar showing weekly progress
- Protected time blocks with distinct visual styling (locked icon, different color)
- Drag-and-drop restrictions prevent accidental displacement
- Progress bar with weekly goal tracking

**Implementation Logic:**
- Non-negotiable blocks get scheduling priority during weekly planning
- System warns when total commitments exceed time needed for priority
- AI optimization always preserves non-negotiable time allocation

### 2. Attention Budget Management

#### 2.1 Attention Type Classification

**Objective:** Categorize all events by cognitive demand type to enable attention tracking

**Attention Types:**
- **Create** - Deep work requiring sustained focus (writing, coding, designing)
- **Decide** - Choice-making and evaluation tasks (approvals, strategy, prioritization)
- **Connect** - Relationship and communication work (meetings, check-ins, alignment)
- **Review** - Assessment and feedback tasks (code review, performance evaluation)
- **Recover** - Rest and reflection time (breaks, learning, strategic thinking)

**User Interface:**
- Attention type selector in event creation/editing forms
- Color-coded timeline visualization by attention type
- Quick-action buttons for common attention type + duration combinations
- Bulk editing tools for applying attention types to existing events

#### 2.2 Daily Attention Budget System

**Objective:** Prevent cognitive overload through attention resource management

**Budget Rules (Configurable):**
- Maximum 2 "Decide" blocks per day (decision fatigue prevention)
- No more than 3 context switches in a 4-hour window
- At least 1 "Recover" block per day in peacetime mode
- "Create" blocks require 90+ minute minimum duration
- Maximum 6 total attention type changes per day

**Budget Tracking:**
- Real-time attention budget dashboard in timeline sidebar
- Traffic light system (Green/Yellow/Red) for budget status
- Daily attention score based on cognitive load optimization
- Historical tracking with weekly attention patterns analysis

**User Interface:**
- Attention budget widget showing current usage vs. limits
- Warning notifications when approaching or exceeding budgets
- Suggestions for alternative scheduling when budget exhausted
- Visual timeline overlay showing attention density

### 3. Focus Protection System

#### 3.1 Context-Switch Cost Warnings

**Objective:** Prevent schedule fragmentation through intelligent conflict detection

**Warning Triggers:**
- Meeting scheduled between two "Create" blocks of same type
- More than 3 different attention types in 4-hour period
- Less than 30 minutes between conflicting attention types
- Back-to-back "Decide" events (decision fatigue risk)
- "Create" block shorter than 90 minutes

**Warning Interface:**
- Modal alerts with specific fragmentation cost explanation
- "Keep, Move, or Merge?" action options
- Alternative time suggestions with attention optimization
- Context-switch counter in daily timeline view

**Smart Suggestions:**
- Recommend clustering similar attention types
- Suggest extending short focus blocks by moving adjacent meetings
- Offer optimal break lengths between different attention types

#### 3.2 Deep Work Block Protection

**Objective:** Preserve and optimize extended focus periods

**Protection Features:**
- "Create" blocks over 2 hours become protected (special styling, drag resistance)
- Automatic buffer time before and after deep work blocks
- Meeting-free zones during peak energy hours (user-defined)
- Smart notifications silenced during protected deep work time

**Optimization Algorithms:**
- Identify natural focus windows based on historical patterns
- Suggest optimal deep work block placement in daily schedule
- Recommend focus block duration based on task complexity
- Learn from user completion patterns to optimize block sizing

### 4. Delegation Workflows

#### 4.1 Delegate Task Conversion

**Objective:** Transform individual tasks into managed team assignments

**Delegation Process:**
1. User clicks "Delegate" button on any timeline event
2. System converts event to delegation record with:
   - **Owner** (who will do the work)
   - **Trust Level** (New/Experienced/Expert)
   - **Reviewer** (optional oversight role)
   - **Context** (background and requirements)

3. Automatic follow-up scheduling based on trust level:
   - **New**: "Work alongside" session + daily check-ins
   - **Experienced**: "Review steps" checkpoint at 25% and 75% completion
   - **Expert**: "Unblock/provide context" session at start only

**User Interface:**
- Delegate button in event context menu
- Trust level selector with descriptions of each level
- Team member picker with availability indicators
- Follow-up scheduling options with recommended cadences

**Database Schema:**
```sql
CREATE TABLE delegations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delegator_id UUID REFERENCES auth.users(id),
  delegate_id UUID REFERENCES auth.users(id),
  timeline_item_id UUID REFERENCES timeline_items(id),
  trust_level TEXT CHECK (trust_level IN ('new', 'experienced', 'expert')),
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  context TEXT,
  follow_up_scheduled_at TIMESTAMP WITH TIME ZONE[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4.2 Router Inbox (Multiplier Mode)

**Objective:** Streamline incoming requests for users in routing/coordination roles

**Inbox Features:**
- Centralized view of all incoming requests and asks
- Quick triage actions: Route, Convert to Meeting, Async Response, Decline
- Template responses for common routing scenarios
- Team capacity visibility for informed routing decisions

**Triage Actions:**
- **Route to Teammate**: Select team member + provide context + estimated effort
- **Convert to Meeting**: Schedule discussion with stakeholder + relevant team members
- **Convert to Async**: Create shared document or knowledge base entry
- **Decline**: Template responses with alternative resources or timing

**User Interface:**
- Inbox widget in Multiplier mode sidebar
- Triage dashboard with drag-and-drop routing
- Team workload indicators for smart routing decisions
- Response templates and automation rules

### 5. Weekly Calibration Ritual

#### 5.1 Planning Wizard Flow

**Objective:** 10-minute guided setup for optimal weekly productivity

**Calibration Steps:**
1. **Role Selection** - Choose primary role for the upcoming week
2. **Zone Assessment** - Evaluate business context (Wartime/Peacetime)
3. **Non-Negotiable Definition** - Identify single most important weekly outcome
4. **Constraint Input** - Note any fixed commitments or limitations
5. **Auto-Generation** - System creates optimized week template
6. **Manual Adjustment** - User modifies generated schedule as needed
7. **Commitment** - User confirms weekly plan and attention goals

**Role Fit Scoring Algorithm:**
- Maker + 15+ meetings = Low fit score (30/100)
- Marker + No decision blocks = Low fit score (25/100)
- Multiplier + 20+ hours solo work = Low fit score (35/100)
- Optimal patterns get 80-95/100 scores

**User Interface:**
- Weekly wizard modal (Sunday evening or Monday morning trigger)
- Progress indicator through calibration steps
- Role fit score with color coding and explanations
- One-click week generation with manual override options

#### 5.2 Weekly Review & Adjustment

**Objective:** Learn from weekly patterns to improve future planning

**Review Components:**
- Attention budget adherence analysis
- Role fit score vs. actual productivity correlation
- Delegation success rate tracking
- Non-negotiable completion percentage

**Insights Generation:**
- Identify optimal role/zone combinations for user
- Recommend attention budget adjustments based on performance
- Suggest delegation patterns that work well
- Highlight time patterns that maximize productivity

### 6. AI-Powered Optimization Features

#### 6.1 "Rewrite My Week" Assistant

**Objective:** AI-powered schedule optimization based on role and constraints

**Input Processing:**
- Current weekly schedule with attention type analysis
- Role/zone context and optimization rules
- Non-negotiable requirements and constraints
- Historical productivity patterns for user

**Optimization Logic:**
- Cluster similar attention types for reduced context switching
- Optimize non-negotiable placement in peak energy hours
- Balance attention budget across weekly pattern
- Suggest delegation opportunities for overcommitted periods

**User Interface:**
- One-click optimization button in weekly view
- Before/after schedule comparison
- Explanation of changes made and reasoning
- Accept all/selective application of suggestions

#### 6.2 "Is This My Job?" Checker

**Objective:** Identify delegation and elimination opportunities

**Analysis Triggers:**
- Events that don't align with current role focus
- Tasks below user's skill/seniority level that could be delegated
- Recurring commitments that could be automated or eliminated
- Meetings where user presence doesn't add unique value

**Suggestion Types:**
- **Delegate**: Recommend team member with trust level assessment
- **Automate**: Identify process improvement opportunities
- **Decline**: Suggest declining with alternative resource recommendations
- **Batch**: Combine similar low-value tasks into single time block

#### 6.3 Meeting Intelligence Pipeline

**Objective:** Convert meeting content into actionable timeline items

**Processing Flow:**
1. **Meeting Notes Ingestion** - Connect to note-taking tools or manual input
2. **Action Item Extraction** - AI identifies commitments and next steps
3. **Owner Assignment** - Map action items to appropriate team members
4. **Timeline Integration** - Auto-schedule follow-up blocks with attention types
5. **Progress Tracking** - Monitor completion and prompt for status updates

**AI Processing Capabilities:**
- Extract explicit action items ("John will review by Friday")
- Identify implicit commitments ("We should look into that option")
- Determine appropriate attention types for different action categories
- Estimate time requirements based on task descriptions

---

## Technical Architecture

### Database Schema Extensions

#### Core Attention System Tables

```sql
-- Extend existing timeline_items table
ALTER TABLE timeline_items ADD COLUMN attention_type TEXT
  CHECK (attention_type IN ('create', 'decide', 'connect', 'review', 'recover'));
ALTER TABLE timeline_items ADD COLUMN priority INTEGER CHECK (priority BETWEEN 1 AND 5) DEFAULT 3;
ALTER TABLE timeline_items ADD COLUMN is_non_negotiable BOOLEAN DEFAULT FALSE;
ALTER TABLE timeline_items ADD COLUMN cognitive_load FLOAT CHECK (cognitive_load BETWEEN 0 AND 1) DEFAULT 0.5;

-- User attention preferences and role configuration
CREATE TABLE user_attention_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  current_role TEXT CHECK (current_role IN ('maker', 'marker', 'multiplier')) DEFAULT 'maker',
  current_zone TEXT CHECK (current_zone IN ('wartime', 'peacetime')) DEFAULT 'peacetime',
  non_negotiable_title TEXT,
  non_negotiable_weekly_hours INTEGER DEFAULT 5,
  peak_hours_start TIME DEFAULT '09:00',
  peak_hours_end TIME DEFAULT '12:00',
  attention_budgets JSONB DEFAULT '{"decide": 2, "context_switches": 3, "create_minimum": 90}',
  role_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delegation workflow management
CREATE TABLE delegations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delegator_id UUID REFERENCES auth.users(id),
  delegate_id UUID REFERENCES auth.users(id),
  timeline_item_id UUID REFERENCES timeline_items(id),
  trust_level TEXT CHECK (trust_level IN ('new', 'experienced', 'expert')),
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
  context TEXT,
  requirements TEXT,
  follow_up_events UUID[] DEFAULT '{}',
  estimated_hours FLOAT,
  actual_hours FLOAT,
  success_rating INTEGER CHECK (success_rating BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Weekly calibration tracking
CREATE TABLE weekly_calibrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  week_start_date DATE,
  role_selected TEXT,
  zone_selected TEXT,
  non_negotiable TEXT,
  weekly_hours_planned INTEGER,
  role_fit_score INTEGER CHECK (role_fit_score BETWEEN 0 AND 100),
  attention_budget_planned JSONB,
  attention_budget_actual JSONB,
  completion_percentage FLOAT,
  user_satisfaction INTEGER CHECK (user_satisfaction BETWEEN 1 AND 5),
  lessons_learned TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Router inbox for Multiplier mode
CREATE TABLE router_inbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  request_from TEXT, -- Could be external email, team member, etc.
  request_content TEXT,
  request_type TEXT CHECK (request_type IN ('meeting', 'task', 'question', 'decision')),
  status TEXT CHECK (status IN ('pending', 'routed', 'scheduled', 'declined', 'responded')),
  routed_to UUID REFERENCES auth.users(id),
  routing_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);
```

### Frontend Component Architecture

#### New Components to Create

```typescript
// Core attention system components
components/attention/
├── RoleZoneSelector.tsx           // Header role/zone controls
├── AttentionBudgetWidget.tsx      // Daily attention dashboard
├── NonNegotiableTracker.tsx       // Weekly priority tracking
├── ContextSwitchWarning.tsx       // Schedule fragmentation alerts
├── AttentionTypeSelector.tsx      // Event creation attention picker
├── FocusBlockProtection.tsx       // Deep work protection interface
├── WeeklyCalibrationWizard.tsx    // Planning ritual flow
├── RoleFitScoring.tsx             // Weekly compatibility analysis
└── AttentionOptimizer.tsx         // AI week rewriting interface

// Delegation workflow components
components/delegation/
├── DelegateButton.tsx             // Task delegation trigger
├── TrustLevelSelector.tsx         // New/Experienced/Expert picker
├── DelegationDashboard.tsx        // Active delegation tracking
├── RouterInbox.tsx                // Multiplier mode request triage
├── FollowUpScheduler.tsx          // Trust-based review scheduling
└── DelegationAnalytics.tsx        // Success rate tracking

// Enhanced timeline integration
components/timeline/attention/
├── AttentionTimelineOverlay.tsx   // Attention type visualization
├── RoleBasedTemplates.tsx         // Role-specific event templates
├── AttentionBudgetIndicator.tsx   // Budget status in timeline
├── ProtectedTimeBlocks.tsx        // Non-negotiable time styling
└── SmartSchedulingSuggestions.tsx // AI optimization hints
```

#### State Management Extensions

```typescript
// Extend TimelineContext with attention features
interface AttentionState {
  userPreferences: UserAttentionPreferences;
  dailyBudget: AttentionBudget;
  weeklyCalibration: WeeklyCalibration;
  delegations: Delegation[];
  routerInbox: RouterInboxItem[];
}

interface AttentionActions {
  updateRole: (role: 'maker' | 'marker' | 'multiplier') => void;
  updateZone: (zone: 'wartime' | 'peacetime') => void;
  setNonNegotiable: (title: string, weeklyHours: number) => void;
  trackAttentionUsage: (eventId: string, attentionType: AttentionType) => void;
  delegateTask: (itemId: string, delegateId: string, trustLevel: TrustLevel) => void;
  startWeeklyCalibration: () => void;
  optimizeWeekWithAI: (constraints: OptimizationConstraints) => void;
}
```

#### API Endpoints

```typescript
// New API routes for attention system
POST   /api/attention/calibrate-week     // Weekly planning ritual
GET    /api/attention/budget-status      // Current attention usage
POST   /api/attention/delegate-task      // Create delegation workflow
GET    /api/attention/role-fit-score     // Weekly role compatibility
POST   /api/attention/optimize-schedule  // AI schedule optimization
GET    /api/attention/analytics          // Usage patterns and insights

// AI-powered endpoints
POST   /api/ai/rewrite-week             // Schedule optimization with AI
POST   /api/ai/analyze-delegation       // Identify delegation opportunities
POST   /api/ai/process-meeting-notes    // Extract action items from meetings
```

### Integration Points

#### Existing Timeline System Integration

**TimelineContext Extension:**
- Add attention state alongside existing items/settings/parkedItems
- Extend existing actions (addItem, updateItem) with attention parameters
- Maintain backwards compatibility with existing timeline functionality

**Database Migration Strategy:**
- Add new columns with DEFAULT values to avoid breaking existing data
- Create new tables without foreign key constraints initially
- Gradual data migration with user opt-in to attention features

**Component Modification Approach:**
- Wrap existing components with attention-aware HOCs
- Add attention features as optional props to existing timeline components
- Progressive enhancement rather than complete rewrites

---

## User Experience Design

### User Interface Integration

#### Timeline Header Enhancements

**Current Header:** View controls (Day/Week/Month), Zoom controls, Lock toggle

**Enhanced Header:**
```
[Role Badge: Maker ▼] [Zone Toggle: Wartime/Peacetime] | [View Controls] [Zoom] [Lock]
                     [Non-Negotiable: Ship v2.0 (3/5 hrs)] | [Add Item ▼]
```

**Role Badge Styling:**
- Maker: Blue badge with focus icon
- Marker: Orange badge with checkmark icon
- Multiplier: Green badge with network icon
- Dropdown shows role description and optimization rules

#### Attention Budget Dashboard

**Location:** Left sidebar below layer manager

**Design:**
```
📊 Daily Attention Budget
━━━━━━━━━━━━━━━━━━━━━
Create:    ████████░░ 80% (3.2/4h)
Decide:    ████████░░ 2/2 blocks
Connect:   ██████░░░░ 60% (1.8/3h)
Review:    ██░░░░░░░░ 20% (0.4/2h)
Recover:   ░░░░░░░░░░ 0% (0/1h) ⚠️

Context Switches: 2/3 ✓
Focus Protection: Active 🔒
```

**Color Coding:**
- Green: Under budget, optimal usage
- Yellow: Approaching limit, caution
- Red: Over budget, needs adjustment
- Gray: Unused capacity

#### Event Creation Flow Enhancement

**Current Flow:** Time + Duration + Title + Layer + Color

**Enhanced Flow:**
```
1. Time & Duration (unchanged)
2. Attention Type selector (Create/Decide/Connect/Review/Recover)
3. Priority level (1-5 scale with descriptions)
4. Title & Description (unchanged)
5. Layer assignment (unchanged)
6. Role-based templates (new - quick options based on current role)
7. Budget impact preview (new - shows attention usage impact)
```

**Smart Defaults:**
- Maker mode: Default to "Create" attention type, 90+ min duration
- Marker mode: Default to "Decide" or "Review", 30-45 min duration
- Multiplier mode: Default to "Connect", 15-30 min duration

#### Focus Protection Visual Design

**Protected Time Blocks:**
- Distinct visual styling with lock icon overlay
- Border color matches attention type but with protection pattern
- Drag resistance (requires confirmation to move)
- Tooltip shows protection reason ("Non-negotiable priority time")

**Context Switch Warnings:**
- Modal overlay when fragmentation detected
- Visual timeline showing before/after context switches
- Suggested alternatives with attention optimization scores
- "Keep/Move/Merge" actions with impact explanations

### Mobile Experience Considerations

#### Responsive Attention Features

**Role/Zone Selection:**
- Simplified mobile header with icon-only role indicator
- Swipe gestures to change role/zone quickly
- Condensed attention budget view with expansion option

**Attention Budget Mobile:**
- Card-based design instead of sidebar widget
- Tap to expand full budget details
- Push notifications for budget warnings

**Delegation Mobile:**
- Quick delegation via swipe gesture on timeline items
- Voice input for delegation context and requirements
- Simplified trust level picker with icons

---

## Success Metrics & Analytics

### Primary KPIs

#### User Engagement Metrics
- **Weekly Calibration Completion Rate**: Target 70% of active users
- **Role Mode Usage**: Target 80% of users actively use role selection
- **Attention Budget Adherence**: Target 80% stay within daily limits
- **Delegation Feature Adoption**: Target 40% of Multiplier users create delegations

#### Productivity Outcome Metrics
- **Context Switch Reduction**: Target 30% fewer switches in Maker mode
- **Focus Block Completion**: Target 85% of protected time blocks completed
- **Non-Negotiable Achievement**: Target 90% of users hit weekly minimums
- **Role Fit Score Improvement**: Target 15-point average increase over 4 weeks

#### System Usage Analytics
- **AI Optimization Usage**: Target 60% of users try "Rewrite My Week" feature
- **Delegation Success Rate**: Target 75% of delegated tasks completed successfully
- **Meeting-to-Action Conversion**: Target 50% of meetings generate timeline items

### Secondary Metrics

#### User Satisfaction Indicators
- **Feature Net Promoter Score**: Survey after 30 days of usage
- **Time-to-Value**: Days until user completes first full weekly calibration
- **Feature Retention**: 30-day retention rate for users who complete calibration

#### Behavioral Pattern Analysis
- **Peak Attention Usage**: Identify optimal role/time/attention combinations
- **Delegation Pattern Success**: Which trust levels and follow-up patterns work best
- **Weekly Planning Adherence**: How closely users follow their calibrated plans

### Analytics Dashboard Design

#### Admin Analytics View
```
📈 Attention System Analytics Dashboard

Usage Overview (Last 30 Days)
- Active Users: 1,247 (+15% vs. previous month)
- Calibration Rate: 68% (Target: 70%)
- Attention Budget Adherence: 76% (Target: 80%)
- Delegation Adoption: 42% (Target: 40%) ✓

Role Distribution
- Maker Mode: 45% of usage time
- Marker Mode: 35% of usage time
- Multiplier Mode: 20% of usage time

Top Success Patterns
1. Maker + Peacetime + Morning deep work: 92% completion rate
2. Marker + Wartime + Decision clustering: 87% satisfaction score
3. Multiplier + Trust level "Experienced": 89% delegation success

Areas for Improvement
- Recovery block usage: Only 34% include daily recovery time
- Weekend planning: 23% completion rate vs. 68% weekday rate
- Context switch warnings: 45% ignored vs. 55% acted upon
```

---

## Implementation Timeline

### Phase 1: Core Attention Infrastructure (Weeks 1-3)

**Week 1: Database & Core Models**
- [ ] Create attention system database tables and migrations
- [ ] Extend TimelineItem interface with attention fields
- [ ] Build user attention preferences API endpoints
- [ ] Create role/zone selection data models

**Week 2: Basic UI Integration**
- [ ] Add role/zone selector to timeline header
- [ ] Create attention type selector component
- [ ] Extend AddItemForm with attention fields
- [ ] Build basic attention budget calculation logic

**Week 3: Timeline Integration**
- [ ] Update TimelineContext with attention state
- [ ] Add attention type visualization to timeline
- [ ] Implement basic budget tracking widget
- [ ] Create role-based event templates

### Phase 2: Attention Budget System (Weeks 4-6)

**Week 4: Budget Engine**
- [ ] Build attention budget calculation algorithms
- [ ] Create daily budget tracking dashboard
- [ ] Implement budget limit validation logic
- [ ] Add budget status API endpoints

**Week 5: Warning System**
- [ ] Build context switch detection logic
- [ ] Create focus protection warning modals
- [ ] Implement budget overflow notifications
- [ ] Add smart scheduling suggestions

**Week 6: Non-Negotiable Protection**
- [ ] Create non-negotiable priority tracker
- [ ] Build protected time block styling
- [ ] Implement conflict detection and warnings
- [ ] Add weekly progress tracking

### Phase 3: Role-Based Optimization (Weeks 7-9)

**Week 7: Role Mode Behaviors**
- [ ] Implement Maker mode focus protection
- [ ] Build Marker mode decision clustering
- [ ] Create Multiplier mode interaction optimization
- [ ] Add role-specific template suggestions

**Week 8: Zone Context Integration**
- [ ] Build Wartime vs. Peacetime behavior differences
- [ ] Implement zone-based scheduling suggestions
- [ ] Create zone transition guidance
- [ ] Add context-aware default settings

**Week 9: Smart Scheduling Logic**
- [ ] Build role-aware event duration suggestions
- [ ] Implement optimal time slot recommendations
- [ ] Create attention-optimized weekly templates
- [ ] Add role fit scoring algorithms

### Phase 4: Delegation Workflows (Weeks 10-12)

**Week 10: Core Delegation System**
- [ ] Build delegation database schema and APIs
- [ ] Create delegate task conversion workflow
- [ ] Implement trust level selection interface
- [ ] Add team member assignment logic

**Week 11: Follow-up Automation**
- [ ] Build trust-based follow-up scheduling
- [ ] Create delegation progress tracking
- [ ] Implement automated check-in reminders
- [ ] Add delegation success analytics

**Week 12: Router Inbox (Multiplier Mode)**
- [ ] Build router inbox interface and API
- [ ] Create request triage workflow
- [ ] Implement routing templates and automation
- [ ] Add team capacity visibility

### Phase 5: AI-Powered Features (Weeks 13-15)

**Week 13: Week Optimization Engine**
- [ ] Build "Rewrite My Week" AI optimization
- [ ] Create schedule analysis algorithms
- [ ] Implement optimization suggestion interface
- [ ] Add before/after comparison views

**Week 14: Delegation Intelligence**
- [ ] Build "Is This My Job?" analysis engine
- [ ] Create delegation opportunity detection
- [ ] Implement AI task categorization
- [ ] Add smart delegation suggestions

**Week 15: Weekly Calibration Ritual**
- [ ] Build weekly planning wizard interface
- [ ] Create role fit scoring algorithms
- [ ] Implement calibration history tracking
- [ ] Add weekly review and adjustment flow

---

## Risk Assessment & Mitigation

### Technical Risks

#### Database Performance Risk
**Risk:** New attention tracking queries impact timeline loading performance
**Likelihood:** Medium
**Impact:** High
**Mitigation:**
- Add database indexes for attention-based queries
- Implement query optimization and caching
- Load testing with attention system enabled
- Progressive feature rollout to monitor performance

#### Complex Feature Integration Risk
**Risk:** Attention system complexity overwhelms existing simple timeline interface
**Likelihood:** Medium
**Impact:** Medium
**Mitigation:**
- Progressive disclosure - start with basic features, add complexity gradually
- Feature flags for opt-in adoption
- Extensive user testing at each phase
- Fallback to simplified mode for users who prefer basic timeline

#### Real-time Update Complexity
**Risk:** Attention budget calculations slow down real-time timeline updates
**Likelihood:** Low
**Impact:** Medium
**Mitigation:**
- Client-side budget calculations where possible
- Debounced budget updates during rapid event changes
- Optimistic UI updates with background sync

### User Adoption Risks

#### Learning Curve Barrier
**Risk:** New attention concepts too complex for users familiar with simple time-blocking
**Likelihood:** High
**Impact:** High
**Mitigation:**
- Comprehensive onboarding flow with interactive examples
- Video tutorials for each major feature
- Progressive feature introduction over multiple weeks
- Optional "Simple Mode" toggle for users who want basic timeline

#### Role System Confusion
**Risk:** Users don't understand when to use Maker vs. Marker vs. Multiplier modes
**Likelihood:** Medium
**Impact:** Medium
**Mitigation:**
- Clear role descriptions with concrete examples
- Contextual help system within role selector
- Smart role suggestions based on calendar patterns
- Weekly calibration includes role selection guidance

#### Delegation Workflow Adoption
**Risk:** Users don't trust AI-suggested delegation opportunities
**Likelihood:** Medium
**Impact:** Low
**Mitigation:**
- Start with conservative delegation suggestions
- User-controlled delegation triggers (not automatic)
- Success story examples and case studies
- Gradual trust building through small delegation wins

### Business Risks

#### Development Timeline Risk
**Risk:** 15-week timeline too aggressive for quality implementation
**Likelihood:** Medium
**Impact:** High
**Mitigation:**
- Phased MVP approach - ship core features first, add enhancements later
- Parallel development tracks where possible
- Buffer time built into each phase
- Scope reduction options identified for each phase

#### User Experience Disruption Risk
**Risk:** Existing timeline users frustrated by interface changes
**Likelihood:** Medium
**Impact:** Medium
**Mitigation:**
- Backwards compatibility maintained throughout rollout
- Feature flags allow disabling attention system
- Gradual UI evolution rather than dramatic changes
- User feedback collection at each phase with rapid iteration

#### Competitive Response Risk
**Risk:** Large calendar providers (Google, Microsoft) copy attention system features
**Likelihood:** Low
**Impact:** Low
**Mitigation:**
- Focus on AI Query Hub integration advantages
- Build deep workflow integration beyond surface features
- Establish user habit formation before competition responds
- Continuous innovation pipeline beyond initial attention system

---

## Quality Assurance & Testing Strategy

### Testing Approach

#### Unit Testing Coverage
- [ ] Attention budget calculation algorithms (target: 95% coverage)
- [ ] Role-based filtering and suggestion logic (target: 90% coverage)
- [ ] Delegation workflow state machines (target: 100% coverage)
- [ ] AI optimization recommendation engines (target: 85% coverage)

#### Integration Testing Scenarios
- [ ] End-to-end weekly calibration flow with role/zone/non-negotiable setup
- [ ] Cross-browser testing for attention budget dashboard and visualizations
- [ ] Mobile responsive testing for condensed attention features
- [ ] Performance testing with large timeline datasets (1000+ events)

#### User Acceptance Testing
- [ ] Guided user testing sessions for weekly calibration wizard
- [ ] A/B testing for different role mode presentations
- [ ] Usability testing for delegation workflow complexity
- [ ] Accessibility testing for attention type color coding and indicators

### Performance Benchmarks

#### Timeline Rendering Performance
- **Target:** Timeline with attention overlays renders in <500ms for 200 events
- **Target:** Real-time attention budget updates in <100ms
- **Target:** Role mode switching in <200ms with visual feedback

#### Database Query Optimization
- **Target:** Attention-filtered timeline queries in <300ms
- **Target:** Weekly calibration data loading in <400ms
- **Target:** Delegation dashboard queries in <250ms

#### Mobile Performance Targets
- **Target:** Attention budget widget loads in <300ms on 3G connection
- **Target:** Role/zone switching responsive in <150ms on mobile devices
- **Target:** Timeline scrolling maintains 60fps with attention overlays

### Rollout Strategy

#### Beta Testing Program
**Phase 1 (Weeks 1-5):** Internal team testing with 10-15 users
- Focus on core attention infrastructure and budget tracking
- Daily feedback collection and rapid iteration
- Performance monitoring and optimization

**Phase 2 (Weeks 6-10):** Closed beta with 50-100 power users
- Full role system and basic delegation workflows
- Weekly user interviews and feature refinement
- Analytics implementation and baseline measurement

**Phase 3 (Weeks 11-15):** Open beta with feature flags
- Complete feature set with AI-powered optimization
- Gradual rollout to all users with opt-in choice
- Success metrics tracking and optimization

#### Feature Flag Strategy
```typescript
// Feature flag configuration for gradual rollout
const attentionSystemFlags = {
  roleBasedPlanning: { enabled: 'beta_users', rollout: 25 },
  attentionBudgets: { enabled: 'all_users', rollout: 75 },
  delegationWorkflows: { enabled: 'team_users', rollout: 50 },
  aiOptimization: { enabled: 'power_users', rollout: 10 },
  weeklyCalibration: { enabled: 'beta_users', rollout: 40 }
};
```

---

## Conclusion

The 3-2-1 Attention System transforms AI Query Hub's timeline from a passive scheduling tool into an **intelligent productivity partner** that actively protects cognitive resources and optimizes for role-specific effectiveness.

### Key Benefits

**For Users:**
- Reduced cognitive overload through attention budget management
- Role-optimized scheduling that matches work patterns to mental energy
- Systematic delegation workflows that scale personal productivity
- AI-powered insights that improve planning over time

**For AI Query Hub:**
- Differentiated product positioning in crowded calendar market
- Increased user engagement through weekly calibration rituals
- Data insights into productivity patterns for future feature development
- Foundation for advanced AI-powered productivity coaching

**Competitive Advantages:**
- First calendar tool to treat attention as a measurable, manageable resource
- Integration with existing AI Query Hub workflows and knowledge systems
- Role-based adaptation that serves both individual contributors and managers
- Systematic approach to delegation that most productivity tools ignore

### Success Factors

The implementation success depends on:
- **Gradual introduction** to avoid overwhelming existing users
- **Clear value demonstration** through concrete productivity improvements
- **Strong onboarding** that teaches attention management concepts effectively
- **Continuous optimization** based on user behavior and feedback

This PRD provides the comprehensive foundation for transforming calendar management from time-blocking to attention-optimization, creating measurable productivity improvements for AI Query Hub users.

---

**Next Steps:**
1. Stakeholder review and technical feasibility assessment
2. Design mockups and user flow prototyping
3. Development team capacity planning and sprint organization
4. Beta user recruitment and testing program setup
5. Implementation kickoff with Phase 1 database and infrastructure work