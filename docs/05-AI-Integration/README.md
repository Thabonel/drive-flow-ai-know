# AI Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [AI Providers](#ai-providers)
3. [Model Configuration](#model-configuration)
4. [AI Features](#ai-features)
5. [Prompt Engineering](#prompt-engineering)
6. [Token Management](#token-management)
7. [Error Handling & Fallbacks](#error-handling--fallbacks)

---

## Overview

AI Query Hub integrates multiple AI providers for different capabilities:

- **Anthropic Claude** - Primary provider for text generation and analysis
- **Google Gemini** - Image generation and multimodal
- **OpenAI** - Fallback provider via OpenRouter
- **Ollama** - Local/offline mode

---

## AI Providers

### Provider Hierarchy

```
User Query
    │
    ├──> Claude (Primary)
    │      └──> Web Search Tool (Brave API)
    │
    ├──> OpenRouter (Fallback if Claude fails)
    │
    └──> Ollama (Offline Mode)
```

### 1. Anthropic Claude

**API**: Anthropic Messages API
**Endpoint**: `https://api.anthropic.com/v1/messages`
**Auth**: API key via `x-api-key` header

**Models**:
- **Claude Opus 4.5** - Most capable model, primary for complex tasks
- **Claude Sonnet 4.5** - Fast and balanced, for general queries
- **Claude Haiku 4.5** - Cheapest, for simple tasks

**Configuration** (`supabase/functions/_shared/models.ts`):
```typescript
export const CLAUDE_MODELS = {
  PRIMARY: Deno.env.get('CLAUDE_PRIMARY_MODEL') || 'claude-opus-4-5',
  FAST: Deno.env.get('CLAUDE_FAST_MODEL') || 'claude-sonnet-4-5',
  CHEAP: Deno.env.get('CLAUDE_CHEAP_MODEL') || 'claude-haiku-4-5',
};
```

**Usage Example**:
```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': anthropicKey,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: CLAUDE_MODELS.PRIMARY,
    max_tokens: 4096,
    messages: [
      { role: 'user', content: userQuery }
    ],
    system: systemPrompt,
    tools: [webSearchTool]  // Optional
  })
});
```

**Tool Use** (Web Search):
```typescript
const webSearchTool = {
  name: "web_search",
  description: "Search the web for current information",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query to find current information"
      }
    },
    required: ["query"]
  }
};

// Claude will invoke this tool if needed
// Example: User asks "What's the latest on AI regulations?"
```

**Response Format**:
```typescript
{
  id: "msg_xxx",
  type: "message",
  role: "assistant",
  content: [
    {
      type: "text",
      text: "Here's the answer..."
    }
  ],
  model: "claude-opus-4-5",
  stop_reason: "end_turn",
  usage: {
    input_tokens: 156,
    output_tokens: 423
  }
}
```

---

### 2. Google Gemini

**API**: Google Generative Language API
**Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/`
**Auth**: API key via `x-goog-api-key` header

**Models**:
- **Gemini 3 Pro Image** - Image generation (Nano Banana Pro)
- **Gemini 2.5 Flash** - Fast text model
- **Gemini 3 Flash** - Latest multimodal model

**Primary Use**: Image generation for pitch decks

**Configuration**:
```typescript
export const GEMINI_MODELS = {
  PRIMARY: Deno.env.get('GEMINI_MODEL') || 'google/gemini-2.5-flash',
  IMAGE: 'gemini-3-pro-image-preview',  // Image generation
};
```

**Image Generation** (`generate-image/index.ts`):
```typescript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': geminiApiKey,
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: enhancedPrompt }]
      }],
      generationConfig: {
        responseModalities: ["image"]
      }
    })
  }
);

// Extract base64 image
const imageData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
```

**Capabilities**:
- 2K/4K image output
- Text rendering for logos, diagrams
- Up to 14 reference images
- Character consistency
- SynthID watermarking

---

### 3. OpenAI (via OpenRouter)

**API**: OpenRouter API (aggregates multiple providers)
**Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
**Auth**: Bearer token

**Models**:
- **GPT-4o** - OpenAI's latest flagship model
- **GPT-4o-mini** - Smaller, faster variant

**Configuration**:
```typescript
export const OPENROUTER_MODELS = {
  PRIMARY: Deno.env.get('OPENROUTER_MODEL') || 'openai/gpt-4o',
  FAST: 'openai/gpt-4o-mini',
};
```

**Usage Example**:
```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${openRouterKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: OPENROUTER_MODELS.PRIMARY,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery }
    ]
  })
});
```

---

### 4. Ollama (Local/Offline)

**API**: Local REST API
**Endpoint**: `http://localhost:11434/api/generate`
**Auth**: None (local)

**Models**:
- **Llama3** - Default local model
- Configurable via `LOCAL_MODEL` environment variable

**Configuration**:
```typescript
export const LOCAL_MODELS = {
  PRIMARY: Deno.env.get('LOCAL_MODEL') || 'llama3',
};
```

**Offline Mode** (`src/lib/ai.ts`):
```typescript
export function offlineEnabled(): boolean {
  return localStorage.getItem('offline-mode') === 'true';
}

export async function callLLM(prompt: string): Promise<string> {
  if (offlineEnabled()) {
    // Use local Ollama
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        model: 'llama3',
        prompt: prompt,
        stream: false
      })
    });
    const data = await response.json();
    return data.response;
  } else {
    // Use cloud providers
    return callCloudLLM(prompt);
  }
}
```

---

## Model Configuration

### Centralized Model Management

**File**: `supabase/functions/_shared/models.ts`

**Purpose**: Single source of truth for all AI model IDs

**Benefits**:
1. **Easy Updates**: Change model in one place
2. **Environment Overrides**: Override via env vars without code changes
3. **Automatic Latest**: Aliases like `claude-opus-4-5` point to latest version
4. **Semantic Tiers**: Use PRIMARY/FAST/CHEAP instead of specific models

### Model Tiers

```typescript
// Use semantic tiers in code
import { CLAUDE_MODELS } from '../_shared/models.ts';

// Complex analysis
model: CLAUDE_MODELS.PRIMARY  // Opus 4.5

// General queries
model: CLAUDE_MODELS.FAST     // Sonnet 4.5

// Simple summarization
model: CLAUDE_MODELS.CHEAP    // Haiku 4.5
```

### Environment Variable Overrides

**Set in Supabase Dashboard → Settings → Edge Functions → Secrets**:

```bash
# Override default models
CLAUDE_PRIMARY_MODEL=claude-opus-4-5-20251101  # Pin specific version
CLAUDE_FAST_MODEL=claude-sonnet-4-5
CLAUDE_CHEAP_MODEL=claude-haiku-4-5

# Override providers
OPENROUTER_MODEL=openai/gpt-4o
GEMINI_MODEL=google/gemini-3-flash

# Provider selection
USE_OPENROUTER=true  # Prefer OpenRouter over Claude
USE_LOCAL_LLM=true   # Use Ollama for offline mode
```

### Model Alias System

**Anthropic Aliases** (auto-update to latest):
- `claude-opus-4-5` → Latest Opus 4.5 release
- `claude-sonnet-4-5` → Latest Sonnet 4.5 release
- `claude-haiku-4-5` → Latest Haiku 4.5 release

**Pinned Versions** (for reproducibility):
- `claude-opus-4-5-20251101` → Specific release

---

## AI Features

### 1. Document Q&A

**Function**: `ai-query/index.ts`

**Flow**:
1. User submits query
2. Fetch user's documents (or specific KB)
3. Calculate relevance scores
4. Build context from top 10 docs
5. Send to Claude with context
6. Return answer

**Relevance Scoring**:
```typescript
function calculateRelevance(doc: Document, query: string): number {
  const docText = `${doc.title} ${doc.content} ${doc.ai_summary}`.toLowerCase();
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  let score = 0;
  queryWords.forEach(word => {
    const count = (docText.match(new RegExp(word, 'g')) || []).length;
    score += count;
  });

  // Boost if title matches
  if (doc.title.toLowerCase().includes(query.slice(0, 20))) {
    score += 10;
  }

  return score;
}
```

**Context Building**:
```typescript
const context = topDocs
  .map(doc => `### ${doc.title}\n${doc.ai_summary || doc.content.slice(0, 500)}`)
  .join('\n\n---\n\n');

const prompt = `Using the following documents as context, answer the user's question.

## Documents

${context}

## Question

${userQuery}

Answer the question based on the provided documents. If the documents don't contain relevant information, say so.`;
```

---

### 2. Pitch Deck Generation

**Function**: `generate-pitch-deck/index.ts`

**Algorithm**:
1. Accept topic, style, target audience
2. Optionally accept source documents
3. Rank documents by relevance
4. Extract key metrics (percentages, revenue, users)
5. Build context
6. Claude generates deck structure
7. Parallel image generation for each slide
8. Return complete deck

**Prompt Structure**:
```typescript
const prompt = `You are an expert pitch deck consultant.

Topic: ${topic}
Audience: ${targetAudience}
Style: ${style}
Number of Slides: ${numberOfSlides}

${documentContext ? `## Source Documents\n\n${documentContext}` : ''}

Create a ${style} pitch deck with the following structure:
- Opening slide with strong hook
- Problem/opportunity slides (2-3)
- Solution slides (3-5)
- Proof/traction slides (2-3)
- Closing slide with CTA

For each slide, provide:
1. Title
2. Content (bullet points, max 3-4 per slide)
3. Visual type (chart, diagram, illustration, icon, photo)
4. Visual prompt (what to illustrate)
5. Speaker notes

Return JSON in this format:
{
  "title": "Main deck title",
  "subtitle": "Subtitle",
  "slides": [
    {
      "slideNumber": 1,
      "title": "...",
      "content": "...",
      "visualType": "illustration",
      "visualPrompt": "...",
      "notes": "..."
    }
  ]
}`;
```

**Image Generation**:
```typescript
// For each slide with visualPrompt
const imagePromises = slides.map(async (slide) => {
  if (slide.visualPrompt && slide.visualType !== 'none') {
    const imageResponse = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
      method: 'POST',
      headers: { 'Authorization': authHeader },
      body: JSON.stringify({
        prompt: slide.visualPrompt,
        style: slide.visualType,
        aspectRatio: '16:9'
      })
    });

    if (imageResponse.ok) {
      const { imageData } = await imageResponse.json();
      slide.imageData = imageData;  // base64 PNG
    }
  }
});

await Promise.all(imagePromises);  // Parallel generation
```

---

### 3. Document Summarization

**Function**: `ai-document-analysis/index.ts`

**Prompt**:
```typescript
const prompt = `Analyze the following document and provide:

1. A concise summary (200-300 words)
2. Key topics (3-5 topics)
3. Suggested tags (5-7 tags)
4. Category (choose from: business, technical, research, legal, marketing, other)

## Document

Title: ${doc.title}

Content:
${doc.content}

Return JSON:
{
  "summary": "...",
  "topics": ["topic1", "topic2", ...],
  "tags": ["tag1", "tag2", ...],
  "category": "business"
}`;
```

---

### 4. Daily Brief

**Function**: `generate-daily-brief/index.ts`

**Prompt**:
```typescript
const prompt = `Generate a daily brief for the user based on their schedule and tasks.

## Today's Date: ${today}

## Timeline Items for Today:
${timelineItems.map(item => `- ${item.title} (${item.scheduled_start})`).join('\n')}

## Recent Activity:
${recentActivity}

Provide:
1. Morning summary (what's coming up today)
2. Priorities (top 3 tasks)
3. Workload analysis (estimated hours vs available hours)
4. Recommendations (time management tips)
5. Evening reflection prompts

Format as markdown.`;
```

---

### 5. AI Task Breakdown

**Component**: `components/ai/AITaskBreakdown.tsx`

**Prompt**:
```typescript
const prompt = `Break down the following task into smaller, actionable sub-tasks:

Task: ${taskTitle}
Description: ${taskDescription}

Provide 3-7 sub-tasks. Each sub-task should:
- Be specific and actionable
- Take 15-60 minutes
- Include estimated duration
- Be ordered logically

Return JSON:
{
  "subtasks": [
    {
      "title": "...",
      "description": "...",
      "estimated_duration_minutes": 30
    }
  ]
}`;
```

---

### 6. Email-to-Task Extraction

**Function**: `process-email-with-ai/index.ts`

**Prompt**:
```typescript
const prompt = `Extract actionable tasks from this email:

From: ${email.from}
Subject: ${email.subject}
Body:
${email.body}

Identify:
1. Action items (what needs to be done)
2. Priority (low, medium, high, urgent)
3. Deadline (if mentioned)
4. Estimated duration

Return JSON array:
[
  {
    "title": "...",
    "description": "...",
    "priority": "high",
    "deadline": "2025-12-25",
    "estimated_duration_minutes": 30
  }
]`;
```

---

## Prompt Engineering

### Best Practices

1. **Clear Structure**: Use headers, sections, clear formatting
2. **Examples**: Provide few-shot examples when needed
3. **Constraints**: Specify output format (JSON, markdown, etc.)
4. **Context**: Include relevant background information
5. **System Prompts**: Set AI role and behavior

### System Prompts

**General AI Assistant**:
```typescript
const systemPrompt = `You are a helpful AI assistant integrated into AI Query Hub, a productivity application.

Your role:
- Help users find information in their documents
- Provide accurate, concise answers
- Cite sources when possible
- Admit when you don't know something
- Use markdown formatting for readability

Guidelines:
- Be professional and friendly
- Stay on topic
- Protect user privacy
- Don't make up information`;
```

**Pitch Deck Consultant**:
```typescript
const systemPrompt = `You are an expert pitch deck consultant with 20 years of experience helping startups and enterprises create compelling presentations.

Your expertise:
- Storytelling and narrative structure
- Visual design principles
- Persuasive communication
- Data-driven argumentation
- Investor psychology

Your task is to create professional, engaging pitch decks that:
- Capture attention immediately
- Tell a clear, compelling story
- Use data and visuals effectively
- End with a strong call-to-action`;
```

---

## Token Management

### Input Token Optimization

**Document Context Limits**:
```typescript
// Limit context to top 10 most relevant documents
const topDocs = rankedDocs.slice(0, 10);

// Truncate long summaries
const summary = doc.ai_summary || doc.content.substring(0, 500);

// Total context budget: ~50,000 tokens (Claude can handle 200k but keep costs down)
```

**Conversation History**:
```typescript
// Keep last 10 messages only
const recentMessages = conversation.messages.slice(-10);
```

### Output Token Limits

**Claude**:
```typescript
{
  model: CLAUDE_MODELS.PRIMARY,
  max_tokens: 4096,  // Typical
  // Can go up to 8192 if needed
}
```

**Gemini**:
```typescript
// No explicit limit, but typical response is 1-2k tokens
```

### Cost Estimation

**Claude Pricing** (as of Dec 2025):
- **Opus 4.5**: $15/MTok input, $75/MTok output
- **Sonnet 4.5**: $3/MTok input, $15/MTok output
- **Haiku 4.5**: $0.25/MTok input, $1.25/MTok output

**Gemini Pricing**:
- **Gemini 3 Flash**: $0.50/MTok input, $3/MTok output
- **Gemini 3 Pro Image**: ~$0.04 per image

**Example Calculation**:
```typescript
// Pitch deck generation (10 slides, with images)
// - Context: 10 docs × 500 tokens = 5,000 tokens
// - Prompt: 1,000 tokens
// - Output: 2,000 tokens
// - Images: 10 × $0.04 = $0.40

// Cost with Opus 4.5:
// (6,000 / 1,000,000) × $15 + (2,000 / 1,000,000) × $75 + $0.40
// = $0.09 + $0.15 + $0.40 = $0.64
```

---

## Error Handling & Fallbacks

### Provider Fallback Chain

```typescript
async function getLLMResponse(prompt: string): Promise<string> {
  // Try Claude first
  try {
    return await callClaude(prompt);
  } catch (claudeError) {
    console.warn('Claude failed:', claudeError);

    // Try OpenRouter fallback
    try {
      return await callOpenRouter(prompt);
    } catch (openRouterError) {
      console.warn('OpenRouter failed:', openRouterError);

      // Try local Ollama if offline mode enabled
      if (offlineEnabled()) {
        try {
          return await callOllama(prompt);
        } catch (ollamaError) {
          throw new Error('All AI providers failed');
        }
      }

      throw openRouterError;
    }
  }
}
```

### Rate Limiting

**Claude**:
- 10,000 requests/day (Tier 1)
- 40 requests/minute

**Handling**:
```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get('retry-after');
  await sleep(retryAfter * 1000);
  return retry();
}
```

### Timeout Handling

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);  // 30s timeout

try {
  const response = await fetch(apiUrl, {
    signal: controller.signal,
    // ... other options
  });
} catch (error) {
  if (error.name === 'AbortError') {
    throw new Error('AI request timed out');
  }
  throw error;
} finally {
  clearTimeout(timeoutId);
}
```

### Error Messages

**User-Friendly Errors**:
```typescript
try {
  const result = await generatePitchDeck(request);
  return result;
} catch (error) {
  if (error.message.includes('rate limit')) {
    return {
      error: 'Too many requests. Please try again in a few minutes.'
    };
  } else if (error.message.includes('timeout')) {
    return {
      error: 'Request timed out. Please try a simpler query.'
    };
  } else {
    return {
      error: 'An error occurred. Please try again.'
    };
  }
}
```

---

**Next Steps:**
- [Authentication & Security →](../06-Authentication/README.md)
- [APIs & Integrations →](../07-APIs/README.md)
- [Development Guide →](../08-Development/README.md)
