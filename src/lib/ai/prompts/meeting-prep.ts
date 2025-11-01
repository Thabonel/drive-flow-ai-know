/**
 * AI Meeting Preparation Prompts
 * Generates meeting briefs with objectives, talking points, and questions
 */

export interface MeetingContext {
  title: string;
  description?: string;
  attendees?: string[];
  duration_minutes?: number;
  start_time?: string;
  meeting_type?: 'internal' | 'external' | 'client' | '1-on-1' | 'team' | 'other';
}

export interface MeetingPrep {
  objectives: string[];
  talking_points: string[];
  questions_to_ask: string[];
  potential_decisions: string[];
  suggested_duration: number;
  preparation_items: string[];
  confidence: number;
}

export function generateMeetingPrepPrompt(context: MeetingContext): string {
  const {
    title,
    description = '',
    attendees = [],
    duration_minutes,
    meeting_type = 'other',
  } = context;

  return `You are an AI meeting preparation assistant. Generate a concise meeting brief.

Meeting Title: ${title}
${attendees.length > 0 ? `Attendees: ${attendees.join(', ')}` : ''}
${description ? `Context: ${description}` : ''}
${duration_minutes ? `Scheduled Duration: ${duration_minutes} minutes` : ''}
${meeting_type !== 'other' ? `Type: ${meeting_type}` : ''}

Generate a meeting preparation brief with:

1. **Meeting Objectives** (1-3 clear goals for this meeting)
2. **Key Talking Points** (3-5 essential topics to discuss)
3. **Questions to Prepare** (3-5 questions you should be ready to answer or ask)
4. **Potential Decisions** (2-4 decisions that might need to be made)
5. **Preparation Items** (2-3 things to review or prepare before the meeting)
${!duration_minutes ? '6. **Suggested Duration** (realistic time estimate in minutes)' : ''}

Be specific and actionable. Focus on what will make this meeting productive.

Return your response as a JSON object with this structure:
{
  "objectives": ["objective 1", "objective 2"],
  "talking_points": ["point 1", "point 2", "point 3"],
  "questions_to_ask": ["question 1", "question 2"],
  "potential_decisions": ["decision 1", "decision 2"],
  "preparation_items": ["item 1", "item 2"],
  "suggested_duration": 30,
  "confidence": 0.85
}

The confidence score (0-1) should reflect how much context you had to work with.`;
}

export function generateMeetingPrepWithHistory(
  context: MeetingContext,
  pastMeetings: Array<{ title: string; notes?: string; date: string }>
): string {
  const basePrompt = generateMeetingPrepPrompt(context);

  if (pastMeetings.length === 0) {
    return basePrompt;
  }

  const historyContext = pastMeetings
    .slice(0, 3) // Last 3 meetings
    .map((m) => `- ${m.date}: ${m.title}${m.notes ? ` - ${m.notes.slice(0, 100)}` : ''}`)
    .join('\n');

  return `${basePrompt}

**Previous Related Meetings:**
${historyContext}

Use this history to make your suggestions more relevant and build on past discussions.`;
}

/**
 * Parse AI response into structured MeetingPrep object
 */
export function parseMeetingPrepResponse(response: string): MeetingPrep {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      objectives: parsed.objectives || [],
      talking_points: parsed.talking_points || [],
      questions_to_ask: parsed.questions_to_ask || [],
      potential_decisions: parsed.potential_decisions || [],
      suggested_duration: parsed.suggested_duration || 30,
      preparation_items: parsed.preparation_items || [],
      confidence: parsed.confidence || 0.5,
    };
  } catch (error) {
    console.error('Failed to parse meeting prep response:', error);

    // Fallback: basic parsing
    return {
      objectives: ['Review meeting agenda', 'Align on next steps'],
      talking_points: ['Status update', 'Challenges and blockers', 'Next priorities'],
      questions_to_ask: ['What are the key blockers?', 'What decisions need to be made?'],
      potential_decisions: ['Project timeline', 'Resource allocation'],
      suggested_duration: 30,
      preparation_items: ['Review previous meeting notes', 'Prepare status update'],
      confidence: 0.3,
    };
  }
}
