# Role-Based Optimization System Guide

## Overview

The Role-Based Optimization System is an AI-powered productivity enhancement that adapts your timeline and scheduling based on three core productivity roles and two operational contexts. It provides intelligent scheduling, optimization suggestions, and smart templates tailored to your specific working style.

## Core Concepts

### Three Productivity Roles

#### 🛠️ **Maker Mode**
- **Purpose**: Deep work and creative output
- **Focus**: Protect uninterrupted focus time
- **Optimization Goals**:
  - Minimum 90-120 minute focus blocks
  - Maximum 3 meetings per day
  - Protected peak hours (9-12 AM by default)
  - Minimal context switching

#### 📋 **Marker Mode**
- **Purpose**: Decision-making and strategic direction
- **Focus**: Efficient decision processing
- **Optimization Goals**:
  - Maximum 2 decision blocks per day
  - Batch similar decisions together
  - 30-45 minute decision windows
  - Prevent decision fatigue

#### 🎯 **Multiplier Mode**
- **Purpose**: Team enablement and delegation
- **Focus**: Amplify team effectiveness
- **Optimization Goals**:
  - Delegate tasks longer than 60 minutes
  - Minimum 3 hours of team-facing time daily
  - 15-30 minute connection blocks
  - Maximum 2 hours personal creation time

### Two Operational Zones

#### ⚔️ **Wartime Context**
- **Characteristics**: High-pressure, strict priorities
- **Behaviors**: 20% stricter limits, protected non-negotiables
- **Usage**: During crises, tight deadlines, critical projects

#### 🕊️ **Peacetime Context**
- **Characteristics**: Balanced, exploratory approach
- **Behaviors**: Normal flexibility, relationship building
- **Usage**: Normal operations, growth periods, learning phases

## Features

### 1. Smart Templates

**Purpose**: Pre-configured time blocks optimized for your role and zone.

**Components**:
- `RoleBasedTemplates` - Full-featured template dialog
- `RoleBasedTemplatesCompact` - Simplified picker for sidebars

**Usage**:
```tsx
import { RoleBasedTemplates } from '@/components/timeline/RoleBasedTemplates';

<RoleBasedTemplates
  currentRole="multiplier"
  currentZone="wartime"
  onTemplateSelect={(template) => {
    // Add template to timeline
    console.log('Selected:', template);
  }}
  onOptimizationApply={(suggestion) => {
    // Apply optimization suggestion
    console.log('Applied:', suggestion);
  }}
/>
```

**Template Features**:
- **Duration Optimization**: Automatically adjusts based on role/zone
- **Zone Adaptation**: Wartime templates are 20% longer with strict protection
- **Role Alignment**: Templates match preferred attention types
- **Adaptive Reasoning**: AI-generated explanations for each template

### 2. Role Fit Scoring

**Purpose**: Real-time assessment of how well your schedule aligns with your role.

**Scoring Breakdown**:
- **Time Allocation** (0-100%): Time spent on preferred attention types
- **Attention Balance** (0-100%): Adherence to attention budgets
- **Context Switching** (0-100%): Cognitive efficiency score
- **Energy Alignment** (0-100%): High-energy work during peak hours

**Integration**:
```tsx
import { useRoleOptimizer } from '@/hooks/useRoleOptimizer';

const { roleFitScore, loading } = useRoleOptimizer({
  autoRefresh: true,
  includeWeeklyAnalysis: true,
});

// roleFitScore contains:
// - score: Overall 0-100 rating
// - breakdown: Detailed category scores
// - recommendations: Actionable improvement suggestions
// - warnings: Critical issues to address
```

### 3. Optimization Engine

**Purpose**: AI-powered suggestions for improving your schedule.

**Suggestion Types**:
- **Schedule**: Add missing time blocks
- **Batch**: Group similar activities
- **Delegate**: Identify delegation opportunities
- **Reschedule**: Move items to optimal times
- **Protect**: Mark critical items as non-negotiable
- **Split**: Break large items into manageable chunks
- **Merge**: Combine fragmented activities

**Component**:
```tsx
import { RoleOptimizationPanel } from '@/components/timeline/RoleOptimizationPanel';

<RoleOptimizationPanel
  onOptimizationApply={async (suggestion) => {
    // Auto-apply optimization
    await applyOptimization(suggestion);
  }}
/>
```

### 4. Intelligent Delegation

**Purpose**: Smart delegation recommendations with role-based analysis.

**Features**:
- **Role Analysis**: Different delegation rules per role
- **Trust Levels**: New, Experienced, Expert delegation workflows
- **Follow-up Scheduling**: Automated check-ins based on trust level
- **Context Provision**: Guided handoff with instructions

**Usage**:
```tsx
import { DelegationButton } from '@/components/timeline/DelegationButton';

<DelegationButton
  item={timelineItem}
  onDelegate={(item, delegateInfo) => {
    // Handle delegation
    console.log('Delegated:', item, delegateInfo);
  }}
/>
```

**Role-Based Delegation Logic**:
- **Maker**: Delegate review/admin, keep creative work
- **Marker**: Delegate execution, keep decisions
- **Multiplier**: Delegate most work over 60 minutes

### 5. Real-Time Monitoring

**Purpose**: Continuous optimization monitoring with trend analysis.

**Hook Usage**:
```tsx
import { useRoleFitMonitor } from '@/hooks/useRoleOptimizer';

const {
  currentScore,     // Current role fit percentage
  trend,           // 'improving' | 'declining' | 'stable'
  breakdown,       // Category breakdown scores
} = useRoleFitMonitor(60000); // Check every minute
```

## Implementation Guide

### Step 1: Set Up User Preferences

Ensure users have attention preferences configured:

```sql
-- Database schema (already exists)
CREATE TABLE user_attention_preferences (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  current_role role_mode_enum,
  current_zone zone_context_enum,
  attention_budgets JSONB,
  peak_hours_start TIME,
  peak_hours_end TIME,
  -- ... other fields
);
```

```tsx
// Update user role/zone
const { updateAttentionPreferences } = useTimelineContext();

await updateAttentionPreferences({
  current_role: 'multiplier',
  current_zone: 'wartime',
});
```

### Step 2: Add Optimization to Timeline Controls

```tsx
// Enhanced timeline controls with optimization
import { TimelineControls } from '@/components/timeline/TimelineControls';

<TimelineControls
  // ... existing props
  onTemplateSelect={(template) => {
    // Add template to timeline
    addTimelineItem(template);
  }}
  onOptimizationApply={(suggestion) => {
    // Apply suggestion automatically
    applyOptimization(suggestion);
  }}
  compact={false} // Full optimization features
/>
```

### Step 3: Integrate with Timeline Creation

```tsx
// Timeline item creation with optimization
const handleAddItem = async (title, duration, startTime) => {
  // Get optimization recommendations
  const optimalSlots = findOptimalTimeSlot('create', duration);
  const suggestedTime = optimalSlots[0]?.time || startTime;

  await addItem(layerId, title, suggestedTime, duration, color, {
    attention_type: 'create',
    // ... other fields
  });
};
```

### Step 4: Monitor and Optimize

```tsx
// Continuous optimization monitoring
const { dailySuggestions, applyOptimization } = useRoleOptimizer();

// Auto-apply high-priority suggestions
useEffect(() => {
  const highPriorityItems = dailySuggestions.filter(s => s.priority === 'high');
  if (highPriorityItems.length > 0) {
    // Notify user of important optimizations
    showOptimizationNotification(highPriorityItems);
  }
}, [dailySuggestions]);
```

## Best Practices

### For Makers
- **Schedule deep work during peak hours** (typically 9-12 AM)
- **Batch meetings to end of day** to protect morning focus
- **Use 90-120 minute creation blocks** minimum
- **Delegate review work** when possible
- **Protect 4+ hour focus sessions** for complex work

### For Markers
- **Batch similar decisions** into focused sessions
- **Limit to 2 decision blocks per day** maximum
- **Schedule decisions during high-energy times**
- **Build in recovery time** after decision sessions
- **Delegate execution work** to preserve decision capacity

### For Multipliers
- **Delegate tasks over 60 minutes** to team members
- **Schedule 3+ hours of team-facing time** daily
- **Use short 15-30 minute connection blocks**
- **Limit personal creation to 2 hours** maximum
- **Focus on enabling others** over personal output

### Zone Context Guidelines

#### Wartime Best Practices
- **Ruthlessly protect non-negotiables** with strict time boundaries
- **Defer non-essential activities** until peacetime
- **Minimize context switching** between different work types
- **Use 20% longer time blocks** to account for increased focus needs
- **Apply strict meeting limits** (50% of peacetime allowance)

#### Peacetime Best Practices
- **Explore new opportunities** and learning activities
- **Build relationships** through collaborative work
- **Allow flexibility** in schedule adjustments
- **Invest in team development** and process improvement
- **Balance work types** across attention categories

## API Reference

### RoleOptimizer Class

```typescript
class RoleOptimizer {
  calculateRoleFitScore(items: TimelineItem[]): RoleFitScore;
  generateOptimizationSuggestions(items: TimelineItem[], date?: Date): OptimizationSuggestion[];
  generateSmartTemplates(): RoleTemplate[];
  findOptimalTimeSlot(attentionType: AttentionType, duration: number, date: Date, existingItems: TimelineItem[]): TimeSlot[];
}
```

### Hooks

```typescript
// Main optimization hook
function useRoleOptimizer(options?: {
  targetDate?: Date;
  includeWeeklyAnalysis?: boolean;
  autoRefresh?: boolean;
}): {
  optimizer: RoleOptimizer | null;
  roleFitScore: RoleFitScore | null;
  dailySuggestions: OptimizationSuggestion[];
  weeklySuggestions: OptimizationSuggestion[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  applyOptimization: (suggestion: OptimizationSuggestion) => Promise<void>;
  findOptimalTimeSlot: (attentionType: string, duration: number) => TimeSlot[];
};

// Real-time monitoring hook
function useRoleFitMonitor(intervalMs?: number): {
  currentScore: number | null;
  lastScore: number | null;
  trend: 'improving' | 'declining' | 'stable';
  breakdown: ScoreBreakdown | null;
};

// Smart templates hook
function useSmartTemplates(role?: string, zone?: string): RoleTemplate[];
```

## Troubleshooting

### Common Issues

**Low Role Fit Score**
- Check if attention types match role preferences
- Verify peak hours are properly utilized
- Reduce context switching between activities
- Ensure attention budgets are realistic

**No Optimization Suggestions**
- Add more timeline items for analysis
- Check that attention types are set on items
- Verify role and zone settings are configured
- Ensure recent timeline data exists

**Templates Not Appearing**
- Confirm user has attention preferences set
- Check role and zone are properly configured
- Verify template generation isn't failing
- Ensure component has correct props

**Delegation Recommendations Not Working**
- Check team membership and permissions
- Verify items have appropriate attention types
- Ensure duration thresholds are met
- Confirm role is set to Multiplier for best results

### Performance Considerations

- **Optimization calculations** run client-side for responsiveness
- **Large datasets** (100+ items) may have slight delays
- **Real-time monitoring** can be disabled to reduce resource usage
- **Template generation** is cached based on role/zone

### Testing

Run the comprehensive test suite:

```bash
# Unit tests for optimization engine
npm test src/tests/integration/role-optimization.test.ts

# Component tests
npm test src/components/timeline/RoleBasedTemplates.test.tsx

# Hook tests
npm test src/hooks/useRoleOptimizer.test.ts
```

## Future Enhancements

### Planned Features
- **Machine Learning Adaptation**: Learn from user behavior patterns
- **Calendar Integration**: Optimize based on external calendar data
- **Team Optimization**: Cross-team role coordination
- **Advanced Analytics**: Long-term productivity trend analysis
- **Custom Role Definitions**: User-defined role types and rules

### Extensibility
- **Custom Optimization Rules**: Plugin system for organization-specific logic
- **Third-party Integrations**: Connect with project management tools
- **API Extensions**: Webhook support for external optimization triggers
- **Mobile Optimization**: Touch-friendly optimization controls

---

## Support

For issues, questions, or feature requests related to the Role-Based Optimization System:

1. **Check this guide** for implementation details
2. **Review the test files** for usage examples
3. **Examine the demo component** for complete integration
4. **Test with the RoleOptimizationDemo** component

The system is designed to be intuitive and self-explanatory, with AI-powered insights guiding users toward better productivity patterns aligned with their natural working style.