# APIs & Integrations

## Table of Contents
1. [External APIs](#external-apis)
2. [Cloud Storage](#cloud-storage)
3. [Calendar Integration](#calendar-integration)
4. [Payment Processing](#payment-processing)
5. [AI APIs](#ai-apis)
6. [Search APIs](#search-apis)

---

## External APIs

### API Overview

AI Query Hub integrates with 10+ external services:

| Service | Purpose | Auth Method |
|---------|---------|-------------|
| Google Drive | Document sync | OAuth 2.0 |
| Google Calendar | Calendar sync | OAuth 2.0 |
| Microsoft Graph | OneDrive sync | OAuth 2.0 |
| Dropbox | Document sync | OAuth 2.0 |
| Anthropic | Claude AI | API Key |
| Google AI | Gemini models | API Key |
| OpenRouter | Multi-model AI | API Key |
| Brave Search | Web search | API Key |
| Stripe | Payments | API Key + Webhooks |

---

## Cloud Storage

### Google Drive API

**Documentation**: https://developers.google.com/drive/api/v3
**Base URL**: `https://www.googleapis.com/drive/v3`
**Auth**: OAuth 2.0

**Scopes Required**:
```
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/userinfo.email
```

**List Files**:
```typescript
const response = await fetch(
  `https://www.googleapis.com/drive/v3/files?` + new URLSearchParams({
    q: "mimeType='application/vnd.google-apps.document' or mimeType='application/pdf'",
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
    pageSize: '100'
  }),
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);
```

**Download File**:
```typescript
// For Google Docs, export as PDF
const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`;

// For regular files
const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

const response = await fetch(url, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

const fileContent = await response.text();
```

**Edge Function**: `supabase/functions/google-drive-sync/index.ts`

---

### Microsoft Graph API (OneDrive)

**Documentation**: https://learn.microsoft.com/en-us/graph/api/overview
**Base URL**: `https://graph.microsoft.com/v1.0`
**Auth**: OAuth 2.0

**Scopes Required**:
```
Files.Read
User.Read
```

**List Files**:
```typescript
const response = await fetch(
  'https://graph.microsoft.com/v1.0/me/drive/root/children',
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);
```

**Download File**:
```typescript
const response = await fetch(
  `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/content`,
  {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  }
);
```

**Edge Function**: `supabase/functions/microsoft-drive-sync/index.ts`

---

### Dropbox API

**Documentation**: https://www.dropbox.com/developers/documentation
**Base URL**: `https://api.dropboxapi.com/2`
**Auth**: OAuth 2.0

**Scopes Required**:
```
files.content.read
```

**List Files**:
```typescript
const response = await fetch(
  'https://api.dropboxapi.com/2/files/list_folder',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      path: '',
      recursive: false
    })
  }
);
```

**Download File**:
```typescript
const response = await fetch(
  'https://content.dropboxapi.com/2/files/download',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({ path: filePath })
    }
  }
);
```

**Edge Function**: `supabase/functions/dropbox-sync/index.ts`

---

## Calendar Integration

### Google Calendar API

**Documentation**: https://developers.google.com/calendar/api/v3
**Base URL**: `https://www.googleapis.com/calendar/v3`
**Auth**: OAuth 2.0

**Scopes Required**:
```
https://www.googleapis.com/auth/calendar
```

**List Events**:
```typescript
const response = await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/primary/events?` + new URLSearchParams({
    timeMin: new Date().toISOString(),
    maxResults: '100',
    singleEvents: 'true',
    orderBy: 'startTime'
  }),
  {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  }
);
```

**Create Event**:
```typescript
const response = await fetch(
  'https://www.googleapis.com/calendar/v3/calendars/primary/events',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      summary: 'Meeting Title',
      description: 'Meeting description',
      start: {
        dateTime: '2025-12-21T10:00:00-05:00',
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: '2025-12-21T11:00:00-05:00',
        timeZone: 'America/New_York'
      },
      attendees: [
        { email: 'attendee@example.com' }
      ]
    })
  }
);
```

**Update Event**:
```typescript
const response = await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      summary: 'Updated Title',
      start: { dateTime: newStartTime }
    })
  }
);
```

**Delete Event**:
```typescript
await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
  {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  }
);
```

**Edge Function**: `supabase/functions/google-calendar-sync/index.ts`

**Sync Strategy**:
1. Fetch calendar events from Google
2. Fetch timeline items from database
3. Compare and identify:
   - New calendar events → Create timeline items
   - Updated calendar events → Update timeline items
   - Deleted calendar events → Delete timeline items
   - New timeline items → Create calendar events
   - Updated timeline items → Update calendar events
4. Store sync timestamp

---

## Payment Processing

### Stripe API

**Documentation**: https://stripe.com/docs/api
**Base URL**: `https://api.stripe.com/v1`
**Auth**: Bearer token (API key)

**Create Customer**:
```typescript
const response = await fetch('https://api.stripe.com/v1/customers', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${stripeApiKey}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    email: userEmail,
    metadata: { user_id: userId }
  })
});
```

**Create Subscription**:
```typescript
const response = await fetch('https://api.stripe.com/v1/subscriptions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${stripeApiKey}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    customer: customerId,
    items: JSON.stringify([{ price: priceId }]),
    payment_behavior: 'default_incomplete',
    expand: JSON.stringify(['latest_invoice.payment_intent'])
  })
});
```

**Webhook Handling**:
```typescript
// Edge Function: stripe-webhook/index.ts
import Stripe from 'https://esm.sh/stripe@12.0.0';

const stripe = new Stripe(stripeApiKey);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!;
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
```

**Edge Functions**:
- `stripe-webhook/` - Webhook handler
- `create-subscription/` - Create subscription
- `create-portal-session/` - Billing portal

---

## AI APIs

### Anthropic Claude API

**Documentation**: https://docs.anthropic.com/claude/reference
**Base URL**: `https://api.anthropic.com/v1`
**Auth**: `x-api-key` header

**Create Message**:
```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': anthropicApiKey,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: [
      { role: 'user', content: 'What is machine learning?' }
    ],
    system: 'You are a helpful assistant.'
  })
});
```

**With Tools**:
```typescript
{
  model: 'claude-opus-4-5',
  max_tokens: 4096,
  messages: [...],
  tools: [
    {
      name: "web_search",
      description: "Search the web for current information",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string" }
        },
        required: ["query"]
      }
    }
  ]
}
```

**Edge Functions**:
- `ai-query/` - Main AI query handler
- `generate-pitch-deck/` - Pitch deck generation
- `ai-document-analysis/` - Document summarization

---

### Google Gemini API

**Documentation**: https://ai.google.dev/gemini-api/docs
**Base URL**: `https://generativelanguage.googleapis.com/v1beta`
**Auth**: `x-goog-api-key` header

**Generate Image**:
```typescript
const response = await fetch(
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': geminiApiKey
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: imagePrompt }]
      }],
      generationConfig: {
        responseModalities: ["image"]
      }
    })
  }
);

// Extract base64 image
const imageData = result.candidates[0].content.parts[0].inlineData.data;
```

**Edge Function**: `generate-image/index.ts`

---

### OpenRouter API

**Documentation**: https://openrouter.ai/docs
**Base URL**: `https://openrouter.ai/api/v1`
**Auth**: Bearer token

**Chat Completion**:
```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${openRouterApiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'openai/gpt-4o',
    messages: [
      { role: 'user', content: 'Hello!' }
    ]
  })
});
```

**Used in**: `ai-query/index.ts` as fallback provider

---

## Search APIs

### Brave Search API

**Documentation**: https://brave.com/search/api/
**Base URL**: `https://api.search.brave.com/res/v1`
**Auth**: `X-Subscription-Token` header

**Web Search**:
```typescript
const response = await fetch(
  `https://api.search.brave.com/res/v1/web/search?` + new URLSearchParams({
    q: searchQuery,
    count: '10'
  }),
  {
    headers: {
      'X-Subscription-Token': braveApiKey
    }
  }
);

const results = await response.json();
// results.web.results contains array of search results
```

**Used in**: `ai-query/index.ts` for Claude's web search tool

**Response Structure**:
```json
{
  "web": {
    "results": [
      {
        "title": "Page Title",
        "url": "https://example.com",
        "description": "Page description...",
        "published": "2025-12-20T10:00:00Z"
      }
    ]
  }
}
```

---

**Next Steps:**
- [Development Guide →](../08-Development/README.md)
