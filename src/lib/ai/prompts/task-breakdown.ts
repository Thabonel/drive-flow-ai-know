/**
 * AI Task Decomposition Prompts
 * Breaks down large tasks into manageable subtasks with time estimates
 */

export interface TaskContext {
  title: string;
  description?: string;
  estimated_duration?: number;
  tags?: string[];
  task_type?: string;
}

export interface Subtask {
  id: string;
  title: string;
  description: string;
  estimated_minutes: number;
  order: number;
  tags: string[];
  confidence: number;
  is_optional: boolean;
  dependencies: string[]; // IDs of subtasks that must be completed first
}

export interface TaskBreakdown {
  subtasks: Subtask[];
  total_estimated_minutes: number;
  overall_confidence: number;
  breakdown_rationale: string;
}

export function generateTaskBreakdownPrompt(context: TaskContext): string {
  const {
    title,
    description = '',
    estimated_duration,
    tags = [],
    task_type = 'work',
  } = context;

  return `You are an AI task decomposition expert. Break down this task into smaller, manageable subtasks.

Task: ${title}
${description ? `Description: ${description}` : ''}
${estimated_duration ? `Total Time Budget: ${estimated_duration} minutes` : ''}
${tags.length > 0 ? `Tags: ${tags.join(', ')}` : ''}
Type: ${task_type}

Break this down into 3-8 subtasks. Each subtask should:
- Be completable in one sitting (15-90 minutes)
- Have a clear deliverable
- Be ordered logically
- Include realistic time estimates

For each subtask, identify:
1. **Title**: Clear, action-oriented name
2. **Description**: What needs to be done (1 sentence)
3. **Estimated Time**: Minutes needed (be realistic)
4. **Tags**: Relevant tags (e.g., "research", "writing", "design")
5. **Is Optional**: Can this be skipped if time is tight?
6. **Dependencies**: Which subtasks must be done first?
7. **Confidence**: How confident are you in this breakdown? (0-1)

Consider common patterns:
- Research/Planning tasks come first
- Creative work needs time for iteration
- Review/testing happens at the end
- Buffer for unexpected issues

Return your response as a JSON object:
{
  "subtasks": [
    {
      "id": "1",
      "title": "Research existing solutions",
      "description": "Review similar implementations and gather requirements",
      "estimated_minutes": 30,
      "order": 1,
      "tags": ["research"],
      "confidence": 0.9,
      "is_optional": false,
      "dependencies": []
    }
  ],
  "total_estimated_minutes": 120,
  "overall_confidence": 0.85,
  "breakdown_rationale": "Brief explanation of how task was broken down"
}`;
}

export function generateBreakdownWithHistory(
  context: TaskContext,
  similarTasks: Array<{ title: string; subtasks: string[]; actual_duration: number }>
): string {
  const basePrompt = generateTaskBreakdownPrompt(context);

  if (similarTasks.length === 0) {
    return basePrompt;
  }

  const historyContext = similarTasks
    .slice(0, 2) // Last 2 similar tasks
    .map(
      (t) =>
        `- "${t.title}" (${t.actual_duration}min):\n  ${t.subtasks.map((s) => `• ${s}`).join('\n  ')}`
    )
    .join('\n\n');

  return `${basePrompt}

**Similar Tasks You've Completed:**
${historyContext}

Use this history to make your breakdown more accurate and realistic.`;
}

/**
 * Parse AI response into structured TaskBreakdown object
 */
export function parseTaskBreakdownResponse(response: string): TaskBreakdown {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      subtasks: parsed.subtasks || [],
      total_estimated_minutes: parsed.total_estimated_minutes || 0,
      overall_confidence: parsed.overall_confidence || 0.5,
      breakdown_rationale: parsed.breakdown_rationale || '',
    };
  } catch (error) {
    console.error('Failed to parse task breakdown response:', error);

    // Fallback: create basic breakdown
    return {
      subtasks: [
        {
          id: '1',
          title: 'Plan and outline',
          description: 'Create a plan and outline for the task',
          estimated_minutes: 20,
          order: 1,
          tags: ['planning'],
          confidence: 0.6,
          is_optional: false,
          dependencies: [],
        },
        {
          id: '2',
          title: 'Execute main work',
          description: 'Complete the core work for this task',
          estimated_minutes: 60,
          order: 2,
          tags: ['work'],
          confidence: 0.5,
          is_optional: false,
          dependencies: ['1'],
        },
        {
          id: '3',
          title: 'Review and finalize',
          description: 'Review work and make final adjustments',
          estimated_minutes: 20,
          order: 3,
          tags: ['review'],
          confidence: 0.6,
          is_optional: false,
          dependencies: ['2'],
        },
      ],
      total_estimated_minutes: 100,
      overall_confidence: 0.4,
      breakdown_rationale: 'Basic three-phase breakdown (plan, execute, review)',
    };
  }
}

/**
 * Determine if a task should be auto-decomposed
 */
export function shouldAutoDecompose(estimatedMinutes?: number, title?: string): boolean {
  // Auto-decompose if task is >2 hours
  if (estimatedMinutes && estimatedMinutes > 120) {
    return true;
  }

  // Auto-decompose if title suggests complexity
  const complexKeywords = [
    'prepare',
    'build',
    'create',
    'develop',
    'implement',
    'design',
    'write',
    'plan',
    'organize',
    'research',
    'analyze',
  ];

  if (title) {
    const lowerTitle = title.toLowerCase();
    return complexKeywords.some((keyword) => lowerTitle.includes(keyword));
  }

  return false;
}
