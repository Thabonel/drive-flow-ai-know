// AI Prompt Templates for Timeline Planning
// Centralized prompt engineering for consistent, high-quality AI interactions

export const GOAL_PLANNING_PROMPTS = {
  /**
   * Analyze a natural language goal and extract structured information
   */
  analyzeGoal: (goal: string, timeframe: string) => `You are an expert goal planning assistant with deep knowledge of productivity, project management, and time estimation.

User's Goal: "${goal}"
Timeframe: ${timeframe}

Analyze this goal carefully and provide a structured breakdown. Consider:
- The complexity and scope of the goal
- Typical time requirements for similar goals based on industry standards
- The specified timeframe and whether it's realistic
- Breaking down aspirational goals into concrete, measurable outcomes
- Common pitfalls and dependencies
- Required skills and resources

Respond with a JSON object:
{
  "interpretedGoal": "A clear, specific, measurable restatement of the goal",
  "estimatedHours": number (realistic total hours needed, considering learning curves and setbacks),
  "suggestedPriority": "low" | "medium" | "high" | "critical",
  "category": "work" | "personal" | "health" | "learning" | "social",
  "targetDate": "ISO date string based on the timeframe from today",
  "rationale": "2-3 sentence explanation of your time estimate and approach"
}

Be realistic with time estimates. Add 20-30% buffer for unforeseen challenges.
Respond with ONLY valid JSON, no markdown formatting or other text.`,

  /**
   * Break a goal into logical milestones
   */
  createMilestones: (
    interpretedGoal: string,
    timeframe: string,
    estimatedHours: number,
    targetDate: string
  ) => `You are creating a strategic project plan with clear milestones.

Goal: ${interpretedGoal}
Timeframe: ${timeframe}
Total Estimated Hours: ${estimatedHours}
Target Date: ${targetDate}

Break this goal into 3-7 major milestones that represent distinct phases or achievements. Each milestone should be:
- A significant, measurable achievement
- Logically sequenced (each builds on previous ones)
- Roughly proportional in time (unless certain phases naturally require more effort)
- Clear enough that completion can be objectively verified

Consider:
- Natural breaking points in the work
- Dependencies between phases
- Progressive complexity (start simple, build up)
- Quick wins early to maintain motivation
- Buffer time for integration and testing

Respond with a JSON array:
[
  {
    "title": "Clear, action-oriented milestone name",
    "description": "What will be accomplished and why it matters",
    "weekNumber": number (1-based week number within the timeframe),
    "estimatedHours": number (must sum to total estimated hours),
    "dependencies": [array of milestone titles this depends on - use exact titles from previous milestones]
  }
]

Ensure estimatedHours across all milestones sums to approximately ${estimatedHours}.
Respond with ONLY valid JSON, no markdown formatting or other text.`,

  /**
   * Generate specific, actionable tasks from milestones
   */
  generateTasks: (milestones: any[], goalCategory: string) => `You are breaking down milestones into specific, actionable tasks that can be scheduled.

Milestones:
${JSON.stringify(milestones, null, 2)}

Category: ${goalCategory}

For each milestone, create 3-8 concrete, actionable tasks. Each task must be:
- Specific enough to complete in one session (30-240 minutes)
- Clearly defined with a measurable output
- Atomic (cannot be further broken down)
- Schedulable (can be assigned to a specific time slot)

Task Properties Guide:
- cognitiveLoad:
  * "high": Requires deep focus, problem-solving, creativity (e.g., design, architecture, writing)
  * "medium": Requires steady attention, some decision-making (e.g., coding, research, planning)
  * "low": Routine work, administrative tasks (e.g., setup, documentation, emails)

- flexibility:
  * "high": Can do anytime, no dependencies on others or systems
  * "medium": Some constraints but generally flexible
  * "low": Must be done at specific time (meetings, appointments, time-sensitive)

- preferredTimeOfDay:
  * "morning": Best with high energy and fresh mind (complex problem-solving)
  * "afternoon": Sustained focus work (implementation, execution)
  * "evening": Light work, planning, review (less demanding tasks)

- canSplit:
  * true: Can pause and resume later (research, coding, writing)
  * false: Must complete in one session (meetings, flows that shouldn't be interrupted)

Consider:
- Energy management (don't schedule all high-load tasks together)
- Habit stacking (place new habits after existing routines)
- Progressive overload for fitness/learning goals
- Dependencies between tasks
- Natural workflow sequences

Respond with a JSON array:
[
  {
    "title": "Specific, actionable task name (verb + object)",
    "description": "What exactly to do and what the output should be",
    "durationMinutes": number (30-240, be realistic),
    "milestoneId": "exact milestone ID this belongs to",
    "dependencies": [array of task titles that must complete first],
    "category": "${goalCategory}",
    "priority": number (1-5, where 5 is highest priority),
    "flexibility": "high" | "medium" | "low",
    "cognitiveLoad": "high" | "medium" | "low",
    "preferredTimeOfDay": "morning" | "afternoon" | "evening",
    "canSplit": boolean
  }
]

Respond with ONLY valid JSON, no markdown formatting or other text.`,

  /**
   * Optimize an existing timeline for better balance
   */
  optimizeTimeline: (items: any[]) => `You are a productivity expert analyzing a daily schedule for optimization.

Current Schedule:
${JSON.stringify(items, null, 2)}

Analyze this schedule and identify issues:
1. Work blocks without breaks (>2 hours continuous work)
2. Insufficient sleep (<7 hours)
3. Missing meals or irregular meal times
4. No leisure/personal time (<2 hours)
5. Poor energy management (high cognitive load tasks in evening)
6. Lack of variety (too much of one type of activity)
7. No exercise or movement
8. Social isolation (no social time)

For each issue found, provide:
- Type of issue
- Severity (low/medium/high)
- Current state (what's wrong)
- Suggested fix (specific, actionable)
- Rationale (why this matters)

Respond with a JSON object:
{
  "issues": [
    {
      "type": "work-overload" | "insufficient-sleep" | "skipped-meals" | "no-leisure" | "poor-energy" | "no-variety" | "no-exercise" | "social-isolation",
      "severity": "low" | "medium" | "high",
      "currentState": "description of the problem",
      "suggestedFix": "specific recommendation",
      "rationale": "why this matters for productivity and well-being"
    }
  ],
  "overallScore": number (0-100, higher is better),
  "summaryRecommendation": "1-2 sentence overall assessment"
}

Be constructive and practical. Focus on high-impact, easy-to-implement changes first.
Respond with ONLY valid JSON, no markdown formatting or other text.`,

  /**
   * Suggest adjustments when behind schedule
   */
  progressMonitoring: (
    goal: any,
    plannedProgress: number,
    actualProgress: number,
    remainingTime: number
  ) => `You are monitoring progress on a goal and suggesting adjustments.

Goal: ${JSON.stringify(goal, null, 2)}
Planned Progress: ${plannedProgress}% by this point
Actual Progress: ${actualProgress}%
Time Remaining: ${remainingTime} days

Analyze the situation:
- Are we on track, ahead, or behind?
- If behind, what adjustments are needed?
- Are the original estimates still realistic?
- Should we adjust scope, timeline, or resources?

Respond with a JSON object:
{
  "status": "on-track" | "ahead" | "behind" | "critical",
  "analysis": "Clear assessment of current situation",
  "recommendedActions": [
    {
      "action": "specific action to take",
      "impact": "high" | "medium" | "low",
      "effort": "high" | "medium" | "low"
    }
  ],
  "adjustedTimeline": {
    "newTargetDate": "ISO date string if adjustment needed",
    "rationale": "why this adjustment makes sense"
  },
  "motivationalMessage": "Encouraging, realistic message"
}

Be honest but constructive. If the goal is unrealistic, say so and suggest alternatives.
Respond with ONLY valid JSON, no markdown formatting or other text.`,
};

export const SCHEDULING_PROMPTS = {
  /**
   * Find optimal time for a task considering energy and context
   */
  findOptimalSlot: (task: any, availableSlots: any[], currentSchedule: any[]) => `You are an expert at optimal scheduling considering energy levels, context switching, and productivity patterns.

Task to Schedule:
${JSON.stringify(task, null, 2)}

Available Time Slots:
${JSON.stringify(availableSlots, null, 2)}

Current Schedule Context:
${JSON.stringify(currentSchedule, null, 2)}

Consider:
- Task cognitive load and preferred time of day
- Energy levels throughout the day (highest morning, decline afternoon, low evening)
- Context switching cost (grouping similar tasks reduces overhead)
- Break requirements (no more than 90-120 minutes of intense focus)
- Habit stacking opportunities (new tasks after existing routines)
- Buffer time for task complexity

Select the best slot and explain why.

Respond with JSON:
{
  "selectedSlot": "exact slot ID from available slots",
  "reasoning": "why this slot is optimal",
  "alternativeSlots": [array of 2-3 other good options with brief rationale],
  "warnings": [any concerns about this placement]
}

Respond with ONLY valid JSON, no markdown formatting or other text.`,
};

export const TEMPLATE_PROMPTS = {
  /**
   * Create a custom template from a user description
   */
  createCustomTemplate: (description: string) => `You are helping create a reusable timeline template.

User Description: "${description}"

Create a template definition with appropriate defaults.

Respond with JSON:
{
  "name": "concise template name",
  "description": "clear description of what this template is for",
  "durationMinutes": number (typical duration for this activity),
  "category": "rest" | "personal" | "meal" | "health" | "work" | "travel" | "social" | "learning" | "other",
  "suggestedColor": "hex color code that fits the category",
  "icon": "lucide icon name that represents this activity",
  "isLockedTime": boolean (true if this should happen at a specific time every day),
  "isFlexible": boolean (true if this can be compressed when needed),
  "defaultStartTime": "HH:MM:SS or null" (suggested time if this typically happens at a specific time)
}

Choose icons from this list: moon, sun, coffee, utensils, pizza, dumbbell, briefcase, car, gamepad, book-open, users, sparkles, mail, heart, clipboard-list, graduation-cap, palette, home, shopping-cart

Respond with ONLY valid JSON, no markdown formatting or other text.`,
};

/**
 * Utility function to extract JSON from AI response
 * Handles various response formats (with/without markdown, code blocks, etc.)
 */
export function extractJSON(text: string): any {
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');

  // Try to find JSON object
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch (e) {
      console.error('JSON parse error (object):', e);
    }
  }

  // Try to find JSON array
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch (e) {
      console.error('JSON parse error (array):', e);
    }
  }

  throw new Error('No valid JSON found in AI response');
}

/**
 * Validate that a JSON response matches expected schema
 */
export function validateGoalAnalysis(data: any): boolean {
  return (
    typeof data.interpretedGoal === 'string' &&
    typeof data.estimatedHours === 'number' &&
    ['low', 'medium', 'high', 'critical'].includes(data.suggestedPriority) &&
    typeof data.category === 'string' &&
    typeof data.targetDate === 'string' &&
    typeof data.rationale === 'string'
  );
}

export function validateMilestones(data: any): boolean {
  if (!Array.isArray(data)) return false;

  return data.every(
    m =>
      typeof m.title === 'string' &&
      typeof m.description === 'string' &&
      typeof m.weekNumber === 'number' &&
      typeof m.estimatedHours === 'number' &&
      Array.isArray(m.dependencies)
  );
}

export function validateTasks(data: any): boolean {
  if (!Array.isArray(data)) return false;

  return data.every(
    t =>
      typeof t.title === 'string' &&
      typeof t.description === 'string' &&
      typeof t.durationMinutes === 'number' &&
      t.durationMinutes >= 30 &&
      t.durationMinutes <= 240 &&
      typeof t.milestoneId === 'string' &&
      Array.isArray(t.dependencies) &&
      typeof t.category === 'string' &&
      typeof t.priority === 'number' &&
      ['high', 'medium', 'low'].includes(t.flexibility) &&
      ['high', 'medium', 'low'].includes(t.cognitiveLoad) &&
      typeof t.canSplit === 'boolean'
  );
}
