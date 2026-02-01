import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CLAUDE_MODELS } from '../_shared/models.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimitDb, getRateLimitHeaders, RATE_LIMIT_PRESETS } from '../_shared/rate-limit.ts';

const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface MeetingProcessingRequest {
  meeting_notes?: string;
  meeting_transcript?: string;
  meeting_title: string;
  meeting_date: string;
  attendees?: string[];
  processing_type: 'action_items' | 'summary' | 'follow_up_scheduling' | 'full_analysis';
}

interface ActionItem {
  id: string;
  text: string;
  assignee: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  estimated_duration: number; // minutes
  attention_type: 'create' | 'decide' | 'connect' | 'review' | 'recover';
  dependencies?: string[];
  context: string;
}

interface TeamMember {
  id: string;
  email: string;
  full_name?: string;
}

interface FollowUpEvent {
  title: string;
  description: string;
  suggested_date: string;
  duration_minutes: number;
  attention_type: string;
  attendees: string[];
  priority: number;
}

interface MeetingAnalysisResult {
  meeting_summary: string;
  key_decisions: string[];
  action_items: ActionItem[];
  follow_up_events: FollowUpEvent[];
  next_steps: string[];
  risks_identified: string[];
  team_assignments: {
    team_member: string;
    tasks: string[];
    estimated_workload: number; // hours
  }[];
  scheduling_recommendations: {
    urgent_items: ActionItem[];
    this_week: ActionItem[];
    next_week: ActionItem[];
    backlog: ActionItem[];
  };
}

async function callClaude(prompt: string, systemMessage: string): Promise<string> {
  if (!anthropicApiKey) {
    throw new Error('Claude API key not available');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODELS.FAST, // Use fast model for meeting processing
      max_tokens: 4000,
      system: systemMessage,
      messages: [{
        role: 'user',
        content: prompt
      }]
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((block: any) => block.type === 'text');
  return textBlock?.text || '';
}

async function getTeamMembers(supabase: any, userId: string): Promise<TeamMember[]> {
  // Get team members for this user
  const { data: teamMemberships } = await supabase
    .from('team_members')
    .select(`
      user_id,
      users:user_id (
        id,
        email,
        user_settings (full_name)
      )
    `)
    .neq('user_id', userId); // Include current user and team members

  if (!teamMemberships) return [];

  const teamMembers: TeamMember[] = [];

  for (const membership of teamMemberships) {
    if (!membership.users) continue;

    teamMembers.push({
      id: membership.users.id,
      email: membership.users.email,
      full_name: membership.users.user_settings?.[0]?.full_name
    });
  }

  // Also include current user
  const { data: currentUser } = await supabase
    .from('users')
    .select(`
      id,
      email,
      user_settings (full_name)
    `)
    .eq('id', userId)
    .single();

  if (currentUser) {
    teamMembers.push({
      id: currentUser.id,
      email: currentUser.email,
      full_name: currentUser.user_settings?.[0]?.full_name
    });
  }

  return teamMembers;
}

async function createTimelineItems(
  supabase: any,
  userId: string,
  actionItems: ActionItem[]
): Promise<{ created: number; errors: string[] }> {
  let created = 0;
  const errors: string[] = [];

  for (const item of actionItems) {
    try {
      // Calculate start time based on priority and due date
      let startTime = new Date();

      if (item.due_date) {
        const dueDate = new Date(item.due_date);
        // Schedule high priority items immediately, medium priority items tomorrow, low priority next week
        switch (item.priority) {
          case 'high':
            startTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
            break;
          case 'medium':
            startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
            break;
          case 'low':
            startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Next week
            break;
        }

        // Don't schedule past the due date
        if (startTime > dueDate) {
          startTime = new Date(dueDate.getTime() - item.estimated_duration * 60 * 1000);
        }
      }

      const endTime = new Date(startTime.getTime() + item.estimated_duration * 60 * 1000);

      const { error } = await supabase
        .from('timeline_items')
        .insert({
          user_id: userId,
          title: item.text,
          description: item.context,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: item.estimated_duration,
          attention_type: item.attention_type,
          priority: item.priority === 'high' ? 5 : item.priority === 'medium' ? 3 : 1,
          layer_name: 'Meeting Follow-ups',
          notes: `Action item from meeting. Assignee: ${item.assignee}`
        });

      if (error) {
        errors.push(`Failed to create item "${item.text}": ${error.message}`);
      } else {
        created++;
      }

    } catch (error) {
      errors.push(`Failed to process item "${item.text}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { created, errors };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('AI Meeting Processor function called');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error(`User not authenticated: ${userError?.message || 'No user found'}`);
    }

    // Rate limiting check
    const rateLimitResult = await checkRateLimitDb(
      supabase,
      user.id,
      'ai-meeting-processor',
      RATE_LIMIT_PRESETS.AI_ANALYSIS
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please wait before processing more meetings.',
          retryAfter: rateLimitResult.retryAfter
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            ...getRateLimitHeaders(rateLimitResult),
            'Content-Type': 'application/json'
          }
        }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body: MeetingProcessingRequest = await req.json();
    const {
      meeting_notes,
      meeting_transcript,
      meeting_title,
      meeting_date,
      attendees = [],
      processing_type
    } = body;

    // Validate input
    if (!meeting_title || !meeting_date) {
      throw new Error('Meeting title and date are required');
    }

    if (!meeting_notes && !meeting_transcript) {
      throw new Error('Either meeting notes or transcript must be provided');
    }

    if (!processing_type || !['action_items', 'summary', 'follow_up_scheduling', 'full_analysis'].includes(processing_type)) {
      throw new Error('Valid processing type is required');
    }

    // Get team members for assignment mapping
    const teamMembers = await getTeamMembers(supabase, user.id);
    console.log('Found', teamMembers.length, 'team members for meeting processing');

    const meetingContent = meeting_transcript || meeting_notes || '';

    let analysisResult: any;

    // Build appropriate system message based on processing type
    const baseSystemMessage = `You are an AI meeting intelligence assistant specialized in extracting actionable insights from meeting content and creating structured follow-up plans.

ATTENTION TYPES FOR TASKS:
- create: Deep work requiring sustained focus (writing, designing, building)
- decide: Choice-making and evaluation tasks (approvals, strategy, prioritization)
- connect: Communication and relationship work (meetings, check-ins, presentations)
- review: Assessment and feedback tasks (code review, document review, evaluation)
- recover: Planning and reflection time (research, learning, strategic thinking)

PRIORITY LEVELS:
- high: Must be done immediately, blocking others
- medium: Important but can wait a day or two
- low: Nice to have, can be scheduled for next week

TEAM MEMBERS AVAILABLE:
${teamMembers.map(member => `- ${member.full_name || member.email} (${member.email})`).join('\n')}

Your goal is to transform meeting content into actionable, schedulable timeline items with appropriate attention types and realistic time estimates.`;

    if (processing_type === 'action_items') {
      // Focus only on extracting action items
      const systemMessage = baseSystemMessage + `\n\nFocus specifically on identifying explicit action items, commitments, and next steps from the meeting content.`;

      const prompt = `Extract action items from this meeting:

MEETING: ${meeting_title}
DATE: ${meeting_date}
ATTENDEES: ${attendees.join(', ')}

CONTENT:
${meetingContent}

Extract all action items in this JSON format:

{
  "action_items": [
    {
      "id": "unique_id",
      "text": "Complete market research analysis",
      "assignee": "john@company.com",
      "due_date": "2025-02-10",
      "priority": "high",
      "estimated_duration": 120,
      "attention_type": "create",
      "dependencies": [],
      "context": "Specific context or details about this action item"
    }
  ]
}

Focus on:
1. Explicit commitments ("I will...", "John will handle...", "We need to...")
2. Implied action items from decisions made
3. Follow-up items mentioned
4. Assign to specific team members when clear, otherwise assign to meeting organizer
5. Estimate realistic durations based on task complexity`;

      const claudeResponse = await callClaude(prompt, systemMessage);

      try {
        const parsed = JSON.parse(claudeResponse);
        analysisResult = {
          action_items: parsed.action_items || []
        };
      } catch (parseError) {
        console.error('Failed to parse action items response:', parseError);
        analysisResult = {
          action_items: [],
          error: 'Failed to extract action items from meeting content'
        };
      }

    } else if (processing_type === 'summary') {
      // Focus on meeting summary and key decisions
      const systemMessage = baseSystemMessage + `\n\nFocus on creating a concise but comprehensive summary of the meeting content, highlighting key decisions and outcomes.`;

      const prompt = `Create a meeting summary:

MEETING: ${meeting_title}
DATE: ${meeting_date}
ATTENDEES: ${attendees.join(', ')}

CONTENT:
${meetingContent}

Provide summary in this JSON format:

{
  "meeting_summary": "Brief 2-3 sentence summary of the meeting",
  "key_decisions": [
    "Decision 1 made during the meeting",
    "Decision 2 made during the meeting"
  ],
  "next_steps": [
    "Next step 1",
    "Next step 2"
  ],
  "risks_identified": [
    "Risk or concern raised",
    "Another potential issue"
  ]
}`;

      const claudeResponse = await callClaude(prompt, systemMessage);

      try {
        analysisResult = JSON.parse(claudeResponse);
      } catch (parseError) {
        console.error('Failed to parse summary response:', parseError);
        analysisResult = {
          meeting_summary: 'Failed to generate meeting summary',
          key_decisions: [],
          next_steps: [],
          risks_identified: []
        };
      }

    } else if (processing_type === 'follow_up_scheduling') {
      // Focus on creating follow-up events
      const systemMessage = baseSystemMessage + `\n\nFocus on identifying follow-up meetings, check-ins, and review sessions that should be scheduled based on the meeting content.`;

      const prompt = `Identify follow-up events to schedule:

MEETING: ${meeting_title}
DATE: ${meeting_date}
ATTENDEES: ${attendees.join(', ')}

CONTENT:
${meetingContent}

Suggest follow-up events in this JSON format:

{
  "follow_up_events": [
    {
      "title": "Project status check-in",
      "description": "Review progress on action items from ${meeting_title}",
      "suggested_date": "2025-02-10T14:00:00Z",
      "duration_minutes": 30,
      "attention_type": "connect",
      "attendees": ["attendee1@company.com", "attendee2@company.com"],
      "priority": 3
    }
  ]
}

Look for:
1. Mentioned follow-up meetings
2. Review sessions for deliverables
3. Check-ins based on project timelines
4. Decision points that need additional meetings`;

      const claudeResponse = await callClaude(prompt, systemMessage);

      try {
        analysisResult = JSON.parse(claudeResponse);
      } catch (parseError) {
        console.error('Failed to parse follow-up events response:', parseError);
        analysisResult = {
          follow_up_events: []
        };
      }

    } else if (processing_type === 'full_analysis') {
      // Complete meeting intelligence analysis
      const systemMessage = baseSystemMessage + `\n\nProvide a comprehensive analysis including action items, summary, follow-up scheduling, and team workload distribution.`;

      const prompt = `Perform complete meeting intelligence analysis:

MEETING: ${meeting_title}
DATE: ${meeting_date}
ATTENDEES: ${attendees.join(', ')}

CONTENT:
${meetingContent}

Provide full analysis in this JSON format:

{
  "meeting_summary": "Comprehensive summary of the meeting",
  "key_decisions": ["Decision 1", "Decision 2"],
  "action_items": [
    {
      "id": "item_1",
      "text": "Action item description",
      "assignee": "team_member@company.com",
      "due_date": "2025-02-10",
      "priority": "high",
      "estimated_duration": 90,
      "attention_type": "create",
      "dependencies": [],
      "context": "Additional context"
    }
  ],
  "follow_up_events": [
    {
      "title": "Follow-up meeting",
      "description": "Meeting description",
      "suggested_date": "2025-02-08T15:00:00Z",
      "duration_minutes": 45,
      "attention_type": "connect",
      "attendees": ["attendee@company.com"],
      "priority": 3
    }
  ],
  "next_steps": ["Step 1", "Step 2"],
  "risks_identified": ["Risk 1", "Risk 2"],
  "team_assignments": [
    {
      "team_member": "john@company.com",
      "tasks": ["Task 1", "Task 2"],
      "estimated_workload": 4.5
    }
  ],
  "scheduling_recommendations": {
    "urgent_items": [],
    "this_week": [],
    "next_week": [],
    "backlog": []
  }
}

Be thorough and extract all actionable intelligence from the meeting.`;

      const claudeResponse = await callClaude(prompt, systemMessage);

      try {
        analysisResult = JSON.parse(claudeResponse);
      } catch (parseError) {
        console.error('Failed to parse full analysis response:', parseError);
        analysisResult = {
          meeting_summary: 'Failed to analyze meeting content',
          key_decisions: [],
          action_items: [],
          follow_up_events: [],
          next_steps: [],
          risks_identified: [],
          team_assignments: [],
          scheduling_recommendations: {
            urgent_items: [],
            this_week: [],
            next_week: [],
            backlog: []
          }
        };
      }
    }

    // Auto-schedule action items if they exist and user requested it
    let timelineCreationResult = null;
    if (analysisResult.action_items && analysisResult.action_items.length > 0) {
      console.log('Auto-scheduling', analysisResult.action_items.length, 'action items...');
      timelineCreationResult = await createTimelineItems(supabase, user.id, analysisResult.action_items);
    }

    console.log('Meeting processing completed:', processing_type);

    return new Response(
      JSON.stringify({
        processing_type,
        meeting_info: {
          title: meeting_title,
          date: meeting_date,
          attendees
        },
        analysis_result: analysisResult,
        timeline_creation: timelineCreationResult,
        metadata: {
          content_length: meetingContent.length,
          team_members_found: teamMembers.length,
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in AI Meeting Processor:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Failed to process meeting content'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});