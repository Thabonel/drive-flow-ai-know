import { format } from 'date-fns';

export interface TimeTrackingData {
  task_title: string;
  task_type: string | null;
  estimated_duration_minutes: number | null;
  actual_duration_minutes: number;
  overrun_minutes: number;
  accuracy_percent: number | null;
  completed_at: string;
  day_of_week: number;
  hour_of_day: number;
  is_morning: boolean;
  is_afternoon: boolean;
  is_evening: boolean;
}

export interface TimeIntelligenceInsight {
  category: 'estimation' | 'productivity' | 'patterns' | 'recommendations';
  severity: 'info' | 'warning' | 'success';
  title: string;
  description: string;
  confidence: number; // 0-1
  actionable_tip?: string;
}

export interface TimeIntelligenceResponse {
  insights: TimeIntelligenceInsight[];
  summary: string;
  total_tasks_analyzed: number;
  avg_accuracy: number;
  learning_status: 'learning' | 'confident' | 'expert';
}

/**
 * Generate system prompt for time intelligence analysis
 */
export function generateTimeIntelligenceSystemPrompt(): string {
  return `You are an expert AI time intelligence analyst. Your role is to analyze user's time tracking data and generate actionable insights about their work patterns.

Your analysis should focus on:
1. **Estimation Accuracy**: How well the user estimates task duration
2. **Productivity Patterns**: When the user is most/least productive
3. **Task-Specific Insights**: Patterns for specific types of tasks
4. **Temporal Trends**: Time-of-day and day-of-week patterns
5. **Actionable Recommendations**: Concrete suggestions for improvement

Guidelines for insights:
- Be specific and data-driven
- Focus on actionable patterns (not just observations)
- Use friendly, encouraging language
- Highlight both strengths and areas for improvement
- Consider statistical significance (need enough data points)
- Assign confidence scores based on sample size and consistency

Output Format:
Return a JSON object with:
{
  "insights": [
    {
      "category": "estimation|productivity|patterns|recommendations",
      "severity": "info|warning|success",
      "title": "Short insight title",
      "description": "Detailed explanation with specific numbers",
      "confidence": 0.0-1.0,
      "actionable_tip": "Optional specific action to take"
    }
  ],
  "summary": "Overall summary of user's time management",
  "total_tasks_analyzed": number,
  "avg_accuracy": number (0-100),
  "learning_status": "learning|confident|expert"
}

Learning Status:
- "learning": < 10 tasks tracked
- "confident": 10-50 tasks tracked
- "expert": 50+ tasks tracked

Insight Categories:
- **estimation**: About how well user estimates time
- **productivity**: About when user is most productive
- **patterns**: Recurring behaviors or tendencies
- **recommendations**: Specific suggestions for improvement

Be insightful and helpful!`;
}

/**
 * Generate user prompt for time intelligence analysis
 */
export function generateTimeIntelligencePrompt(
  trackingData: TimeTrackingData[],
  focusArea?: 'estimation' | 'productivity' | 'all'
): string {
  const totalTasks = trackingData.length;
  const tasksWithEstimates = trackingData.filter(t => t.estimated_duration_minutes !== null);

  // Calculate basic statistics
  const avgAccuracy =
    tasksWithEstimates.length > 0
      ? tasksWithEstimates.reduce((sum, t) => sum + (t.accuracy_percent || 0), 0) /
        tasksWithEstimates.length
      : 0;

  const avgOverrun =
    tasksWithEstimates.length > 0
      ? tasksWithEstimates.reduce((sum, t) => sum + t.overrun_minutes, 0) /
        tasksWithEstimates.length
      : 0;

  // Group by time of day
  const morningTasks = trackingData.filter(t => t.is_morning);
  const afternoonTasks = trackingData.filter(t => t.is_afternoon);
  const eveningTasks = trackingData.filter(t => t.is_evening);

  // Group by task type
  const tasksByType = trackingData.reduce((acc, t) => {
    const type = t.task_type || 'unknown';
    if (!acc[type]) acc[type] = [];
    acc[type].push(t);
    return acc;
  }, {} as Record<string, TimeTrackingData[]>);

  const focus = focusArea || 'all';

  return `Analyze the following time tracking data for a user and generate insights.

**Data Summary:**
- Total tasks completed: ${totalTasks}
- Tasks with time estimates: ${tasksWithEstimates.length}
- Average estimation accuracy: ${avgAccuracy.toFixed(1)}%
- Average overrun: ${avgOverrun.toFixed(1)} minutes

**Temporal Distribution:**
- Morning tasks (6am-11am): ${morningTasks.length}
- Afternoon tasks (12pm-5pm): ${afternoonTasks.length}
- Evening tasks (6pm-11pm): ${eveningTasks.length}

**Task Type Breakdown:**
${Object.entries(tasksByType)
  .map(([type, tasks]) => {
    const avgActual = tasks.reduce((sum, t) => sum + t.actual_duration_minutes, 0) / tasks.length;
    const withEstimates = tasks.filter(t => t.estimated_duration_minutes !== null);
    const avgAcc =
      withEstimates.length > 0
        ? withEstimates.reduce((sum, t) => sum + (t.accuracy_percent || 0), 0) /
          withEstimates.length
        : null;
    return `- ${type}: ${tasks.length} tasks, avg ${avgActual.toFixed(0)} min${
      avgAcc !== null ? `, ${avgAcc.toFixed(0)}% accuracy` : ''
    }`;
  })
  .join('\n')}

${focus !== 'all' ? `\n**Focus Area:** Please focus primarily on ${focus} insights.\n` : ''}

**Recent Tasks Sample (last 10):**
${trackingData
  .slice(-10)
  .reverse()
  .map((t) => {
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][t.day_of_week];
    const time = `${String(t.hour_of_day).padStart(2, '0')}:00`;
    const estimate = t.estimated_duration_minutes
      ? `est ${t.estimated_duration_minutes}m → `
      : '';
    return `- [${day} ${time}] ${t.task_title}: ${estimate}${t.actual_duration_minutes}m (${
      t.overrun_minutes > 0 ? '+' : ''
    }${t.overrun_minutes}m)`;
  })
  .join('\n')}

Please analyze this data and provide:
1. Specific insights about the user's time management patterns
2. Actionable recommendations for improvement
3. Highlight both strengths and areas to work on
4. Consider statistical significance (don't over-interpret small samples)

${
  totalTasks < 10
    ? '\nNote: This user is still building their time tracking history. Insights should acknowledge they\'re in a "learning" phase.'
    : totalTasks < 50
    ? '\nNote: User has moderate tracking history. Insights can be "confident" but acknowledge more data will improve accuracy.'
    : '\nNote: User has extensive tracking history. You can provide "expert" level insights with high confidence.'
}

Return the response as valid JSON only, no additional text.`;
}

/**
 * Parse AI response into TimeIntelligenceResponse
 */
export function parseTimeIntelligenceResponse(
  responseText: string
): TimeIntelligenceResponse {
  try {
    // Remove markdown code blocks if present
    let cleanText = responseText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(cleanText);

    // Validate structure
    if (!parsed.insights || !Array.isArray(parsed.insights)) {
      throw new Error('Invalid response: missing insights array');
    }

    return parsed as TimeIntelligenceResponse;
  } catch (error) {
    console.error('Failed to parse time intelligence response:', error);
    throw new Error('Failed to parse AI time intelligence response');
  }
}

/**
 * Calculate estimated duration with AI confidence
 */
export function calculateAIEstimate(
  taskTitle: string,
  taskType: string,
  historicalData: TimeTrackingData[]
): {
  estimated_minutes: number;
  confidence: number;
  reasoning: string;
} {
  // Filter similar tasks
  const similarTasks = historicalData.filter((t) => {
    // Exact task type match
    if (t.task_type === taskType) return true;

    // Fuzzy title match (simple contains check)
    const titleLower = taskTitle.toLowerCase();
    const taskTitleLower = t.task_title.toLowerCase();
    return (
      titleLower.includes(taskTitleLower.slice(0, 5)) ||
      taskTitleLower.includes(titleLower.slice(0, 5))
    );
  });

  if (similarTasks.length === 0) {
    // No historical data - use defaults
    return {
      estimated_minutes: taskType === 'meeting' ? 30 : 60,
      confidence: 0.2,
      reasoning: 'AI is still learning - no similar tasks found',
    };
  }

  // Calculate average and confidence
  const avgDuration =
    similarTasks.reduce((sum, t) => sum + t.actual_duration_minutes, 0) /
    similarTasks.length;

  // Confidence based on sample size and consistency
  let confidence = Math.min(similarTasks.length / 20, 0.95); // Max 95% even with many samples

  // Reduce confidence if high variance
  const variance =
    similarTasks.reduce(
      (sum, t) => sum + Math.pow(t.actual_duration_minutes - avgDuration, 2),
      0
    ) / similarTasks.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / avgDuration;

  if (coefficientOfVariation > 0.5) {
    confidence *= 0.7; // High variance reduces confidence
  }

  let reasoning = `Based on ${similarTasks.length} similar task${
    similarTasks.length > 1 ? 's' : ''
  }`;
  if (similarTasks.length < 5) {
    reasoning += ' - still learning';
  } else if (similarTasks.length < 10) {
    reasoning += ' - gaining confidence';
  }

  return {
    estimated_minutes: Math.round(avgDuration),
    confidence: Number(confidence.toFixed(2)),
    reasoning,
  };
}
