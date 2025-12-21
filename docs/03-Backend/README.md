# Backend Guide - Supabase Edge Functions

## Table of Contents
1. [Overview](#overview)
2. [Edge Functions Architecture](#edge-functions-architecture)
3. [AI Functions](#ai-functions)
4. [Document Functions](#document-functions)
5. [Integration Functions](#integration-functions)
6. [Team & Collaboration Functions](#team--collaboration-functions)
7. [Admin Functions](#admin-functions)
8. [Utility Functions](#utility-functions)
9. [Shared Modules](#shared-modules)

---

## Overview

All backend logic runs as **Supabase Edge Functions** - serverless Deno functions deployed globally. Each function is self-contained with its own `index.ts` file.

### Key Characteristics

- **Runtime**: Deno (TypeScript-first JavaScript runtime)
- **Deployment**: Global edge network
- **Authentication**: JWT validation via Supabase Auth
- **Database**: Direct PostgreSQL access via Supabase client
- **Cold Start**: < 100ms typical
- **Concurrency**: Auto-scaling based on load

### File Location

All Edge Functions: `supabase/functions/*/index.ts`

### Standard Function Structure

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    // 3. Parse request body
    const body = await req.json();

    // 4. Execute business logic
    const result = await handleRequest(body, user);

    // 5. Return successful response
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // 6. Handle errors
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
```

---

## Edge Functions Architecture

```
supabase/functions/
├── _shared/              # Shared utilities
│   └── models.ts         # AI model configuration
│
├── ai-query/             # Main AI query handler
├── generate-pitch-deck/  # Pitch deck generation
├── generate-image/       # Image generation (Gemini)
│
├── parse-document/       # Document parsing
├── ai-document-analysis/ # Document AI analysis
├── claude-document-processor/ # Claude doc processing
│
├── google-drive-sync/    # Google Drive sync
├── microsoft-drive-sync/ # OneDrive sync
├── dropbox-sync/         # Dropbox sync
│
├── google-calendar-sync/ # Google Calendar integration
├── receive-email/        # Email-to-task inbound
├── process-email-with-ai/# AI email processing
│
├── create-team/          # Team creation
├── invite-team-member/   # Team invitations
├── accept-team-invitation/# Accept invite
│
├── stripe-webhook/       # Stripe payment webhooks
├── create-subscription/  # Stripe subscription
│
├── admin-command-center/ # Admin AI assistant
├── admin-users/          # User management
├── admin-email/          # Admin emails
│
└── [40+ other functions]
```

---

## AI Functions

### 1. `ai-query/` - Main AI Query Handler

**Purpose**: Process user queries with AI using document context

**File**: `supabase/functions/ai-query/index.ts`

**Request Body**:
```typescript
{
  query: string;                    // User question
  knowledge_base_id?: string;       // Optional KB ID
  document_ids?: string[];          // Optional specific docs
  include_web_search?: boolean;     // Enable web search tool
  conversation_id?: string;         // Resume conversation
}
```

**Response**:
```typescript
{
  response: string;                 // AI-generated answer
  document_count: number;           // Docs used in context
  knowledge_base_used?: string;     // KB name if used
  web_search_used?: boolean;        // If web search was triggered
  conversation_id: string;          // For follow-ups
}
```

**Algorithm**:
1. Authenticate user
2. Fetch documents (from KB or document_ids or all user docs)
3. Calculate relevance scores for each document
4. Rank documents by relevance
5. Build context from top 10 documents
6. Send to AI provider (Claude → OpenRouter → Ollama fallback chain)
7. AI may invoke web search tool for current information
8. Save query to `ai_query_history` table
9. Return response

**Key Features**:
- Multi-provider fallback (Claude primary, OpenRouter backup, Ollama offline)
- Document relevance ranking
- Web search integration (Brave API)
- Conversation history support
- Usage tracking

**Model Selection**:
```typescript
import { CLAUDE_MODELS } from '../_shared/models.ts';

// Use primary (Opus 4.5) for complex queries
model: CLAUDE_MODELS.PRIMARY
```

**Web Search Tool**:
```typescript
{
  name: "web_search",
  description: "Search the web for current information",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" }
    },
    required: ["query"]
  }
}
```

---

### 2. `generate-pitch-deck/` - AI Pitch Deck Generation

**Purpose**: Generate complete pitch decks with AI

**File**: `supabase/functions/generate-pitch-deck/index.ts`

**Request Body**:
```typescript
{
  topic: string;
  targetAudience?: string;          // Default: 'general business audience'
  numberOfSlides?: number;          // Default: 10
  style?: 'professional' | 'creative' | 'minimal' | 'bold';
  includeImages?: boolean;          // Default: true
  selectedDocumentIds?: string[];   // Source documents
  revisionRequest?: string;         // For revisions
  currentDeck?: PitchDeckResponse;  // Existing deck to revise
  slideNumber?: number;             // Single slide revision
}
```

**Response**:
```typescript
{
  title: string;
  subtitle: string;
  slides: Array<{
    slideNumber: number;
    title: string;
    content: string;
    visualType?: 'chart' | 'diagram' | 'illustration' | 'icon' | 'photo' | 'none';
    visualPrompt?: string;
    imageData?: string;             // base64 encoded image
    notes?: string;                 // Speaker notes
  }>;
  totalSlides: number;
}
```

**Algorithm**:
1. Authenticate user
2. Fetch selected documents (if provided)
3. Calculate document relevance to topic
4. Rank documents by relevance score
5. Extract key metrics from documents (percentages, revenue, users, etc.)
6. Build context from top 10 most relevant documents
7. Send prompt to Claude (PRIMARY model)
8. Claude generates deck structure with:
   - Slide titles and content
   - Visual recommendations
   - Visual prompts for image generation
   - Speaker notes
9. For each slide with `visualPrompt`:
   - Call `generate-image` function in parallel
   - Generate image using Gemini 3 Pro Image
   - Attach base64 image to slide
10. Return complete deck

**Style Guidance**:
- **Professional**: Formal language, data-driven, structured
- **Creative**: Storytelling, bold visuals, innovative metaphors
- **Minimal**: Extreme clarity, white space, one idea per slide
- **Bold**: Strong statements, confident language, striking visuals

**Revision Mode**:
- **Full Deck Revision**: Modify entire deck based on feedback
- **Single Slide Revision**: Update only one slide, preserve others

**Document Relevance Algorithm**:
```typescript
function calculateRelevance(doc: any, topic: string): number {
  const docText = `${doc.title} ${doc.content} ${doc.ai_summary}`.toLowerCase();
  const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  let score = 0;
  topicWords.forEach(word => {
    const count = (docText.match(new RegExp(word, 'g')) || []).length;
    score += count;
  });

  // Boost if title matches
  if (doc.title.toLowerCase().includes(topic.toLowerCase().substring(0, 20))) {
    score += 10;
  }

  return score;
}
```

**Metric Extraction**:
```typescript
// Extracts: "50% growth", "$1M revenue", "10K users"
const patterns = [
  /(\d+%?\s*(?:percent|growth|increase|users))/gi,
  /(\$\d+(?:\.\d+)?(?:[KMB])?)/gi,
  /(\d+(?:[KMB])?\s*(?:users|customers))/gi
];
```

---

### 3. `generate-image/` - AI Image Generation

**Purpose**: Generate images for pitch deck slides

**File**: `supabase/functions/generate-image/index.ts`

**Request Body**:
```typescript
{
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';  // Default: '16:9'
  style?: 'photorealistic' | 'illustration' | 'diagram' | 'chart' | 'icon';
  negativePrompt?: string;
}
```

**Response**:
```typescript
{
  imageData: string;                // base64 encoded PNG
  prompt: string;                   // Enhanced prompt used
}
```

**Model**: **Gemini 3 Pro Image Preview** (aka Nano Banana Pro)
- Released: November 20, 2025
- API: Google Generative Language API
- Features: 2K/4K output, character consistency, text rendering, SynthID watermark

**API Endpoint**:
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent
```

**Prompt Enhancement**:
```typescript
switch (style) {
  case 'photorealistic':
    enhancedPrompt = `Photorealistic, high-quality, detailed: ${prompt}`;
    break;
  case 'illustration':
    enhancedPrompt = `Professional illustration, clean, modern design: ${prompt}`;
    break;
  case 'diagram':
    enhancedPrompt = `Clean technical diagram, minimalist, professional: ${prompt}`;
    break;
  case 'chart':
    enhancedPrompt = `Data visualization, professional chart, clean design: ${prompt}`;
    break;
  case 'icon':
    enhancedPrompt = `Simple icon, minimal design, clean lines: ${prompt}`;
    break;
}

// Add negative prompt
enhancedPrompt += `\n\nAvoid: ${negativePrompt || defaultNegativePrompt}`;
```

**Default Negative Prompt**:
```
blurry, low quality, distorted, watermark, text overlay, stock photo cliche, generic, amateur
```

**Request Format**:
```typescript
{
  contents: [{
    parts: [{ text: enhancedPrompt }]
  }],
  generationConfig: {
    responseModalities: ["image"]
  }
}
```

**Response Parsing**:
```typescript
const imageData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
// imageData is base64 encoded image
```

---

### 4. `ai-document-analysis/` - Document AI Analysis

**Purpose**: Generate AI summaries and metadata for documents

**Request**:
```typescript
{
  document_id: string;
}
```

**Process**:
1. Fetch document content
2. Send to Claude FAST model (Sonnet 4.5)
3. Generate:
   - Summary (200-300 words)
   - Key topics
   - Suggested tags
   - Category classification
4. Update `knowledge_documents` table

---

### 5. `claude-document-processor/` - Advanced Document Processing

**Purpose**: Deep document analysis with Claude

**Features**:
- Extraction of structured data
- Entity recognition
- Relationship mapping
- Custom analysis prompts

---

### 6. `extract-timeline-items/` - Extract Tasks from Documents

**Purpose**: AI extracts timeline items from documents

**Use Case**: Upload meeting notes, get auto-created tasks

---

## Document Functions

### 7. `parse-document/` - Multi-Format Document Parser

**Purpose**: Extract text content from various file formats

**Supported Formats**:
- PDF (.pdf)
- Word (.docx)
- Text (.txt)
- Markdown (.md)
- JSON (.json)
- CSV (.csv)

**Request**:
```typescript
{
  file_url: string;                 // Supabase Storage URL
  file_type: string;                // MIME type
}
```

**Response**:
```typescript
{
  content: string;                  // Extracted text
  metadata: {
    page_count?: number;
    word_count: number;
    detected_language?: string;
  };
}
```

---

### 8. `transcribe-audio/` - Audio Transcription

**Purpose**: Convert audio files to text

**Provider**: OpenAI Whisper API

**Supported Formats**: mp3, mp4, wav, m4a

---

### 9. `save-ai-document/` - Store AI-Generated Documents

**Purpose**: Save AI-generated content as documents

---

## Integration Functions

### 10. `google-drive-sync/` - Google Drive Synchronization

**Purpose**: Sync documents from Google Drive

**File**: `supabase/functions/google-drive-sync/index.ts`

**Algorithm**:
1. Verify user authentication
2. Fetch user's Google OAuth tokens from `user_google_tokens`
3. Refresh access token if expired
4. Fetch file list from Google Drive API
5. Filter for supported file types
6. For each new/modified file:
   - Download file content
   - Call `parse-document` to extract text
   - Call `ai-document-analysis` for summary
   - Store in `knowledge_documents`
7. Update last sync timestamp

**Supported File Types**:
- Google Docs
- Google Sheets
- PDF
- Word documents
- Text files

---

### 11. `microsoft-drive-sync/` - Microsoft OneDrive Sync

**Purpose**: Sync documents from OneDrive

**API**: Microsoft Graph API

---

### 12. `dropbox-sync/` - Dropbox Synchronization

**Purpose**: Sync documents from Dropbox

**API**: Dropbox API v2

---

### 13. `s3-sync/` - Amazon S3 Sync

**Purpose**: Sync documents from S3 bucket

---

### 14. `webdav-sync/` - WebDAV Integration

**Purpose**: Sync from WebDAV servers (Nextcloud, ownCloud)

---

### 15. `sftp-sync/` - SFTP Integration

**Purpose**: Sync from SFTP servers

---

### 16. `google-calendar-sync/` - Google Calendar Integration

**Purpose**: Sync timeline items to Google Calendar

**Features**:
- Two-way sync
- Create calendar events from timeline items
- Update timeline items from calendar changes
- Recurring event support

---

### 17. `google-calendar-sync-scheduled/` - Scheduled Calendar Sync

**Purpose**: Automated periodic sync (runs via cron)

**Trigger**: Supabase cron job (every 15 minutes)

---

## Team & Collaboration Functions

### 18. `create-team/` - Team Creation

**Request**:
```typescript
{
  name: string;
  description?: string;
}
```

**Process**:
1. Create team record
2. Add creator as owner
3. Return team ID

---

### 19. `invite-team-member/` - Team Invitations

**Request**:
```typescript
{
  team_id: string;
  email: string;
  role: 'admin' | 'member' | 'assistant';
}
```

**Process**:
1. Verify requester is team owner/admin
2. Generate invitation token
3. Store in `team_invitations`
4. Send invitation email
5. Return invitation link

---

### 20. `accept-team-invitation/` - Accept Team Invite

**Request**:
```typescript
{
  token: string;
}
```

**Process**:
1. Validate token
2. Add user to `team_members`
3. Grant access to team resources
4. Delete invitation

---

## Email Functions

### 21. `receive-email/` - Inbound Email Handler

**Purpose**: Receive emails forwarded to system

**Use Case**: user@aiqueryhub.com forwards email → creates task

---

### 22. `process-email-with-ai/` - AI Email Processing

**Purpose**: Extract tasks from email content

**Features**:
- Parse email structure
- Extract action items
- Detect urgency/priority
- Create timeline items

---

## Billing Functions

### 23. `stripe-webhook/` - Stripe Webhook Handler

**Purpose**: Handle Stripe payment events

**Events**:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

**Webhook Verification**:
```typescript
const signature = req.headers.get('stripe-signature')!;
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
);
```

---

### 24. `create-subscription/` - Create Stripe Subscription

**Request**:
```typescript
{
  price_id: string;                 // Stripe price ID
  payment_method_id?: string;
}
```

---

### 25. `create-portal-session/` - Billing Portal

**Purpose**: Generate Stripe customer portal link

**Response**:
```typescript
{
  url: string;                      // Portal URL
}
```

---

### 26. `verify-checkout-session/` - Verify Stripe Checkout

**Purpose**: Confirm successful checkout session

---

## Admin Functions

### 27. `admin-command-center/` - Admin AI Assistant

**Purpose**: Natural language admin operations

**Examples**:
- "Show me all users who signed up this week"
- "Delete user with email john@example.com"
- "Update user tier to premium"

**Security**: Requires admin role

---

### 28. `admin-users/` - User Management

**Operations**:
- List users
- Update user data
- Delete users
- Change user tier

---

### 29. `admin-email/` - Send Admin Emails

**Purpose**: Send emails to users

---

### 30. `admin-settings/` - Admin Configuration

**Purpose**: Update system settings

---

## Utility Functions

### 31. `get-google-config/` - Google OAuth Config

**Purpose**: Return Google OAuth client ID

**Public endpoint**: No authentication required

**Response**:
```typescript
{
  client_id: string;
}
```

---

### 32. `get-microsoft-config/` - Microsoft OAuth Config

**Purpose**: Return Microsoft OAuth client ID

---

### 33. `send-confirmation-email/` - Email Confirmation

**Purpose**: Send verification emails

---

### 34. `submit-support-ticket/` - Support Ticket Creation

**Request**:
```typescript
{
  subject: string;
  message: string;
  category: string;
}
```

---

### 35. `register-user/` - User Registration

**Purpose**: Custom user registration logic

---

### 36. `generate-daily-brief/` - AI Daily Brief

**Purpose**: Generate AI-powered daily summary

**Scheduled**: Runs every morning at user's preferred time

---

### 37. `setup-pitch-decks-db/` - Pitch Deck DB Setup

**Purpose**: Initialize pitch deck storage tables

---

### 38. `security-audit/` - Security Audit

**Purpose**: Check for security issues

---

### 39. `analyze-for-charts/` - Chart Data Analysis

**Purpose**: Extract chartable data from documents

---

### 40. `summarize-conversation/` - Conversation Summary

**Purpose**: Generate AI summary of conversation

---

## Shared Modules

### `_shared/models.ts` - AI Model Configuration

**Purpose**: Centralized model ID management

**File**: `supabase/functions/_shared/models.ts`

**Exports**:
```typescript
export const CLAUDE_MODELS = {
  PRIMARY: 'claude-opus-4-5',      // Most capable
  FAST: 'claude-sonnet-4-5',       // Balanced
  CHEAP: 'claude-haiku-4-5',       // Cost-effective
};

export const GEMINI_MODELS = {
  PRIMARY: 'google/gemini-2.5-flash',
  IMAGE: 'gemini-3-pro-image-preview',
};

export const OPENROUTER_MODELS = {
  PRIMARY: 'openai/gpt-4o',
  FAST: 'openai/gpt-4o-mini',
};
```

**Environment Overrides**:
```bash
CLAUDE_PRIMARY_MODEL=claude-opus-4-5-20251101  # Pin specific version
CLAUDE_FAST_MODEL=claude-sonnet-4-5
GEMINI_MODEL=google/gemini-3-flash
```

**Usage**:
```typescript
import { CLAUDE_MODELS } from '../_shared/models.ts';

const response = await fetch('https://api.anthropic.com/v1/messages', {
  body: JSON.stringify({
    model: CLAUDE_MODELS.PRIMARY,  // Use primary model
    messages: [{ role: 'user', content: prompt }]
  })
});
```

---

## Deployment

### Deploy Single Function

```bash
supabase functions deploy ai-query
```

### Deploy All Functions

```bash
supabase functions deploy
```

### Set Environment Variables

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-...
supabase secrets set GEMINI_API_KEY=...
```

### View Logs

```bash
supabase functions logs ai-query --tail
```

---

**Next Steps:**
- [Database Schema →](../04-Database/README.md)
- [AI Integration →](../05-AI-Integration/README.md)
- [Development Guide →](../08-Development/README.md)
