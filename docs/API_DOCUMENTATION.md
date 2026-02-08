# AI Query Hub - API Documentation

**For Advanced Users and Developers**

This documentation covers the API endpoints available in AI Query Hub for advanced use cases, integrations, and programmatic access.

---

## 🔑 Authentication

All API requests require authentication using JWT tokens obtained through the web interface.

### Getting Your API Token

1. Log into https://aiqueryhub.com
2. Go to **Settings → API Access**
3. Click **"Generate API Token"**
4. Copy and store the token securely

### Using Authentication

Include the token in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/endpoint
```

**Security Notes:**
- API tokens inherit your user permissions
- Tokens expire after 24 hours by default
- Regenerate tokens if compromised
- Never commit tokens to version control

---

## 🚀 Core API Endpoints

Base URL: `https://fskwutnoxbbflzqrphro.supabase.co/functions/v1`

### 1. AI Query Endpoint

**Endpoint:** `POST /ai-query`

Send queries to your AI assistant programmatically.

**Request Body:**
```json
{
  "query": "Your question or request",
  "knowledge_base_id": "optional-kb-uuid",
  "include_web_search": true,
  "model_tier": "PRIMARY|FAST|CHEAP",
  "context_limit": 100000,
  "temperature": 0.7
}
```

**Response:**
```json
{
  "response": "AI assistant response",
  "sources": [
    {
      "document_id": "doc-uuid",
      "title": "Document Title",
      "relevance_score": 0.95
    }
  ],
  "model_used": "claude-opus-4-5",
  "processing_time_ms": 1250,
  "context_documents_count": 3,
  "web_search_performed": true
}
```

**Example:**
```bash
curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/ai-query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Summarize my Q1 project documents",
    "knowledge_base_id": "kb-12345",
    "model_tier": "PRIMARY"
  }'
```

### 2. Document Upload

**Endpoint:** `POST /upload-document`

Upload documents for AI processing.

**Request:** Multipart form data
- `file`: Document file (PDF, DOCX, TXT, MD, CSV, JSON)
- `title`: Optional custom title
- `knowledge_base_id`: Optional KB to add to
- `tags`: Optional comma-separated tags

**Response:**
```json
{
  "document_id": "doc-uuid",
  "title": "Document Title",
  "file_size": 1024000,
  "processing_status": "processing|completed|failed",
  "summary": "AI-generated summary",
  "created_at": "2026-02-06T08:00:00Z"
}
```

**Example:**
```bash
curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/upload-document \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf" \
  -F "title=Q1 Marketing Plan" \
  -F "knowledge_base_id=kb-12345"
```

### 3. Semantic Memory Search

**Endpoint:** `POST /search-memories`

Search your semantic memories and conversation history.

**Request Body:**
```json
{
  "query": "Search query",
  "similarity_threshold": 0.6,
  "limit": 10,
  "memory_types": ["conversation", "document", "goal"]
}
```

**Response:**
```json
{
  "memories": [
    {
      "id": "memory-uuid",
      "content": "Memory content",
      "memory_type": "conversation",
      "similarity_score": 0.85,
      "created_at": "2026-02-06T08:00:00Z",
      "metadata": {
        "document_title": "Optional document reference"
      }
    }
  ],
  "total_count": 25
}
```

### 4. Proactive Check-in

**Endpoint:** `POST /proactive-checkin`

Trigger a proactive assistance check manually.

**Request Body:**
```json
{
  "force_checkin": false,
  "urgency_threshold": 0.7,
  "preferred_channel": "web|telegram|slack"
}
```

**Response:**
```json
{
  "checkin_performed": true,
  "urgency_score": 0.85,
  "actions_suggested": [
    "Review upcoming deadlines",
    "Organize recent documents"
  ],
  "next_checkin_at": "2026-02-06T09:00:00Z"
}
```

### 5. Knowledge Base Management

**Endpoint:** `GET /knowledge-bases`

List your knowledge bases.

**Response:**
```json
{
  "knowledge_bases": [
    {
      "id": "kb-uuid",
      "name": "Q1 2026 Projects",
      "description": "All project-related documents",
      "document_count": 15,
      "created_at": "2026-01-01T00:00:00Z",
      "last_updated": "2026-02-06T08:00:00Z"
    }
  ]
}
```

**Create Knowledge Base:** `POST /knowledge-bases`
```json
{
  "name": "Knowledge Base Name",
  "description": "Optional description",
  "document_ids": ["doc-1", "doc-2"]
}
```

---

## 📱 Integration Webhooks

### Telegram Webhook

**Endpoint:** `POST /telegram-webhook`

Receives messages from Telegram bot. Used internally but can be useful for understanding message flow.

**Webhook Security:**
- Validates `X-Telegram-Bot-Api-Secret-Token` header
- Verifies request signature
- Processes authorized user messages only

### Slack Webhook

**Endpoint:** `POST /slack-webhook`

Receives events from Slack integration.

**Event Types Handled:**
- `url_verification` - Initial setup
- `event_callback` - User interactions
- `slash_command` - /aiquery commands

---

## 🔍 Query Examples

### Basic Chat Query
```bash
curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/ai-query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the weather today?"}'
```

### Document Analysis
```bash
curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/ai-query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the key action items in my meeting notes?",
    "knowledge_base_id": "meetings-kb-uuid"
  }'
```

### Fast Response Query
```bash
curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/ai-query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Quick summary of today events",
    "model_tier": "FAST"
  }'
```

### Complex Research Query
```bash
curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/ai-query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Analyze market trends and provide strategic recommendations",
    "include_web_search": true,
    "model_tier": "PRIMARY",
    "context_limit": 150000
  }'
```

---

## 🛡️ Error Handling

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "parameter": "Additional context"
  },
  "request_id": "req-uuid-for-support"
}
```

### Common Error Codes

- `INVALID_TOKEN` - Authentication token is invalid or expired
- `MISSING_QUERY` - Query parameter is required
- `DOCUMENT_NOT_FOUND` - Referenced document doesn't exist
- `PROCESSING_FAILED` - Document or AI processing failed
- `RATE_LIMIT_EXCEEDED` - Too many requests in time window
- `INSUFFICIENT_CREDITS` - Account limits exceeded

---

## 📊 Rate Limits

### Default Limits

| Endpoint | Free Plan | Pro Plan | Enterprise |
|----------|-----------|----------|------------|
| AI Query | 50/day | 1000/day | Unlimited |
| Document Upload | 10/day | 100/day | Unlimited |
| Memory Search | 100/day | 1000/day | Unlimited |
| Proactive Checkin | 50/day | 500/day | Unlimited |

### Rate Limit Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

### Handling Rate Limits
```bash
# Check rate limit status
curl -I https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/ai-query \
  -H "Authorization: Bearer YOUR_TOKEN"

# Implement exponential backoff for 429 responses
```

---

## 🔧 SDKs and Libraries

### JavaScript/TypeScript SDK

```bash
npm install @aiqueryhub/sdk
```

```typescript
import { AIQueryHub } from '@aiqueryhub/sdk';

const client = new AIQueryHub({
  token: 'YOUR_JWT_TOKEN',
  baseURL: 'https://fskwutnoxbbflzqrphro.supabase.co/functions/v1'
});

// Send query
const response = await client.query({
  query: "Analyze my documents",
  knowledgeBaseId: "kb-uuid"
});

// Upload document
const document = await client.uploadDocument({
  file: fileBuffer,
  title: "Meeting Notes"
});

// Search memories
const memories = await client.searchMemories({
  query: "project deadlines",
  limit: 10
});
```

### Python SDK

```bash
pip install aiqueryhub-sdk
```

```python
from aiqueryhub import AIQueryHub

client = AIQueryHub(
    token="YOUR_JWT_TOKEN",
    base_url="https://fskwutnoxbbflzqrphro.supabase.co/functions/v1"
)

# Send query
response = client.query(
    query="Summarize my project documents",
    knowledge_base_id="kb-uuid"
)

# Upload document
document = client.upload_document(
    file_path="document.pdf",
    title="Project Plan"
)

# Search memories
memories = client.search_memories(
    query="meeting notes",
    limit=10
)
```

### cURL Examples Collection

Save as `aiqueryhub-api.sh`:

```bash
#!/bin/bash

# Configuration
BASE_URL="https://fskwutnoxbbflzqrphro.supabase.co/functions/v1"
TOKEN="YOUR_JWT_TOKEN"

# Helper function
api_call() {
  curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$@"
}

# Query AI
query_ai() {
  api_call -X POST "$BASE_URL/ai-query" -d "{\"query\": \"$1\"}"
}

# Upload document
upload_doc() {
  curl -H "Authorization: Bearer $TOKEN" -X POST "$BASE_URL/upload-document" \
    -F "file=@$1" -F "title=$2"
}

# Search memories
search_memories() {
  api_call -X POST "$BASE_URL/search-memories" -d "{\"query\": \"$1\"}"
}

# Usage examples
# query_ai "What are my tasks for today?"
# upload_doc "document.pdf" "Meeting Notes"
# search_memories "project deadlines"
```

---

## 🔗 Webhook Integration

### Setting up Webhooks

**Coming Soon:** Webhook endpoints to receive notifications about:
- Document processing completion
- Proactive check-in triggers
- AI query responses
- Integration events

### Webhook Payload Example
```json
{
  "event": "document.processed",
  "timestamp": "2026-02-06T08:00:00Z",
  "user_id": "user-uuid",
  "data": {
    "document_id": "doc-uuid",
    "title": "Document Title",
    "status": "completed",
    "summary": "AI-generated summary"
  }
}
```

---

## 🧪 Testing and Development

### Test Environment

Use staging endpoints for development:
```
Base URL: https://fskwutnoxbbflzqrphro.supabase.co/functions/v1
Note: Production endpoints only - use test tokens
```

### API Testing Tools

**Postman Collection:**
[Download AI Query Hub API Collection](https://postman.com/aiqueryhub)

**Insomnia Workspace:**
[Import AI Query Hub Workspace](https://insomnia.rest/aiqueryhub)

### Response Validation

All API responses include:
```json
{
  "success": true,
  "timestamp": "2026-02-06T08:00:00Z",
  "request_id": "req-uuid",
  "data": { /* response data */ }
}
```

---

## 📈 Monitoring and Analytics

### Request Tracking

Monitor API usage in your dashboard:
- Total requests per endpoint
- Response times and success rates
- Error frequency and types
- Rate limit utilization

### Performance Metrics

- **AI Query Response Time:** Target <3 seconds
- **Document Upload Processing:** Target <5 minutes
- **Memory Search:** Target <1 second
- **Availability:** 99.9% uptime SLA

---

## 💡 Advanced Use Cases

### 1. Automated Document Processing Pipeline

```bash
#!/bin/bash
# Process documents automatically

for file in *.pdf; do
  echo "Processing $file..."

  # Upload document
  response=$(curl -s -X POST "$BASE_URL/upload-document" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$file" \
    -F "knowledge_base_id=$KB_ID")

  doc_id=$(echo $response | jq -r '.document_id')

  # Wait for processing
  sleep 30

  # Query document
  curl -X POST "$BASE_URL/ai-query" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"Summarize key points\", \"document_id\": \"$doc_id\"}"
done
```

### 2. Scheduled Proactive Analysis

```python
import schedule
import time
from aiqueryhub import AIQueryHub

client = AIQueryHub(token="YOUR_TOKEN")

def daily_analysis():
    response = client.query({
        "query": "Review today's documents and provide priority recommendations",
        "model_tier": "PRIMARY"
    })

    # Process recommendations
    print(f"Daily insights: {response.response}")

# Schedule daily analysis
schedule.every().day.at("09:00").do(daily_analysis)

while True:
    schedule.run_pending()
    time.sleep(60)
```

### 3. Team Knowledge Aggregation

```javascript
const { AIQueryHub } = require('@aiqueryhub/sdk');

const client = new AIQueryHub({ token: process.env.AI_QUERY_HUB_TOKEN });

async function generateTeamReport() {
  // Gather insights from multiple knowledge bases
  const projects = await client.query({
    query: "Summarize progress across all active projects",
    knowledgeBaseId: "projects-kb"
  });

  const meetings = await client.query({
    query: "Extract action items from this week's meetings",
    knowledgeBaseId: "meetings-kb"
  });

  // Combine insights
  const report = await client.query({
    query: `Create a team status report based on:
           Projects: ${projects.response}
           Meetings: ${meetings.response}`,
    modelTier: "PRIMARY"
  });

  return report.response;
}
```

---

## 🔒 Security Best Practices

### Token Management
- Store tokens in environment variables
- Rotate tokens regularly
- Use different tokens for different environments
- Implement token refresh logic

### Request Security
- Always use HTTPS
- Validate SSL certificates
- Implement request signing for webhooks
- Log security events

### Data Protection
- Don't log sensitive data in requests
- Implement proper error handling
- Use secure file upload practices
- Validate all user inputs

---

## 📞 Support and Resources

### API Support
- **Email:** api-support@aiqueryhub.com
- **Response Time:** 2-4 hours for API issues
- **Include:** Request ID, error details, code samples

### Documentation Updates
- **GitHub:** Report documentation issues
- **Email:** docs@aiqueryhub.com
- **Community:** Share examples and use cases

### Rate Limit Increases
- **Enterprise:** Contact sales for custom limits
- **Special Use Cases:** Describe your integration needs
- **Volume Discounts:** Available for high-usage applications

---

**API Version:** v1.0
**Last Updated:** February 6, 2026
**Changelog:** Available at /api/changelog

**Ready to integrate?** Start with our Quick Start examples and expand from there. The API is designed to be intuitive for developers familiar with REST APIs while providing powerful AI capabilities for your applications.