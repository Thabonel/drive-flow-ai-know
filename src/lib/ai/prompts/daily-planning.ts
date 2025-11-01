import { format } from 'date-fns';

export interface Meeting {
  title: string;
  start_time: string; // ISO string
  duration_minutes: number;
  is_flexible: boolean;
}

export interface TimeGap {
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

export interface UserPreferences {
  work_start_time?: string; // HH:MM
  work_end_time?: string; // HH:MM
  lunch_time?: string; // HH:MM
  lunch_duration_minutes?: number;
  break_frequency_minutes?: number; // Take break every X minutes
  focus_time_preferences?: 'morning' | 'afternoon' | 'evening' | 'auto';
  min_focus_block_minutes?: number;
}

export interface DailyPlanBlock {
  title: string;
  start_time: string; // HH:MM
  duration_minutes: number;
  type: 'work' | 'meeting' | 'break' | 'personal';
  color: string;
  is_flexible: boolean;
  reasoning?: string;
  confidence?: number; // 0-1
}

export interface DailyPlanResponse {
  blocks: DailyPlanBlock[];
  summary: string;
  total_work_hours: number;
  total_break_minutes: number;
  total_focus_hours: number;
}

/**
 * Generate the system prompt for daily planning
 */
export function generateSystemPrompt(): string {
  return `You are an expert AI daily planning assistant. Your goal is to create optimal daily schedules that:

1. Respect existing meetings and commitments
2. Add essential routine items (lunch, breaks)
3. Schedule deep focus time in optimal slots
4. Maintain healthy work-life balance
5. Maximize productivity while preventing burnout

Guidelines:
- Morning hours (8-11am) are best for deep focus work
- Schedule breaks every 90-120 minutes
- Lunch should be 45-60 minutes
- Meetings should have 5-10 minute buffers
- End-of-day wrap-up is important for closure
- Flexible blocks can be moved if needed
- Fixed blocks (meetings) cannot be changed

Output Format:
Return a JSON object with:
{
  "blocks": [
    {
      "title": "Block name",
      "start_time": "HH:MM",
      "duration_minutes": number,
      "type": "work|meeting|break|personal",
      "color": "#hexcolor",
      "is_flexible": boolean,
      "reasoning": "Why this block is placed here",
      "confidence": 0.0-1.0
    }
  ],
  "summary": "Overall strategy for this day",
  "total_work_hours": number,
  "total_break_minutes": number,
  "total_focus_hours": number
}

Color codes:
- work: #3b82f6 (blue)
- meeting: #8b5cf6 (purple)
- break: #f59e0b (amber)
- personal: #10b981 (green)

Be thoughtful and strategic in your planning.`;
}

/**
 * Generate the user prompt for daily planning
 */
export function generateDailyPlanningPrompt(
  meetings: Meeting[],
  timeGaps: TimeGap[],
  preferences: UserPreferences,
  targetDate: Date
): string {
  const dateStr = format(targetDate, 'EEEE, MMMM d, yyyy');

  const meetingsText = meetings.length > 0
    ? meetings.map(m => {
        const time = format(new Date(m.start_time), 'HH:mm');
        return `  - ${m.title} at ${time} (${m.duration_minutes} min)`;
      }).join('\n')
    : '  No meetings scheduled';

  const gapsText = timeGaps.length > 0
    ? timeGaps.map(g => {
        const start = format(new Date(g.start_time), 'HH:mm');
        const end = format(new Date(g.end_time), 'HH:mm');
        return `  - ${start} to ${end} (${g.duration_minutes} min)`;
      }).join('\n')
    : '  No gaps available';

  const prefsText = `
  - Work hours: ${preferences.work_start_time || '08:00'} to ${preferences.work_end_time || '17:00'}
  - Lunch time: ${preferences.lunch_time || '12:00'} (${preferences.lunch_duration_minutes || 60} min)
  - Break frequency: Every ${preferences.break_frequency_minutes || 90} minutes
  - Focus time preference: ${preferences.focus_time_preferences || 'morning'}
  - Minimum focus block: ${preferences.min_focus_block_minutes || 90} minutes`;

  return `Create an optimal daily schedule for ${dateStr}.

EXISTING MEETINGS:
${meetingsText}

AVAILABLE TIME GAPS:
${gapsText}

USER PREFERENCES:
${prefsText}

Please create a complete daily schedule that:
1. Includes all existing meetings (mark as type="meeting", is_flexible=false)
2. Adds a proper lunch break
3. Schedules at least ${preferences.min_focus_block_minutes || 90} minutes of focused work time
4. Includes short breaks every ${preferences.break_frequency_minutes || 90} minutes
5. Adds a morning setup/review block (15-30 min)
6. Adds an end-of-day wrap-up block (15-30 min)
7. Optimizes for the user's focus time preference: ${preferences.focus_time_preferences || 'morning'}

Be strategic about when you place deep focus blocks - morning is usually best.
Provide reasoning for each block placement.
Return the response as valid JSON only, no additional text.`;
}

/**
 * Parse AI response into DailyPlanResponse
 */
export function parseDailyPlanResponse(responseText: string): DailyPlanResponse {
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
    if (!parsed.blocks || !Array.isArray(parsed.blocks)) {
      throw new Error('Invalid response: missing blocks array');
    }

    return parsed as DailyPlanResponse;
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    throw new Error('Failed to parse AI planning response');
  }
}

/**
 * Get default user preferences
 */
export function getDefaultPreferences(): UserPreferences {
  return {
    work_start_time: '08:00',
    work_end_time: '17:00',
    lunch_time: '12:00',
    lunch_duration_minutes: 60,
    break_frequency_minutes: 90,
    focus_time_preferences: 'morning',
    min_focus_block_minutes: 90,
  };
}
