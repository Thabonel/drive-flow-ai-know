# Video Generation Service

Async video generation service for AI Query Hub pitch decks. Runs independently in Docker to handle video generation without timeout limits.

## Features

- 🎬 Fal.ai Mochi-1 video generation
- ☁️ Automatic upload to Supabase Storage
- 🐳 Dockerized for easy deployment
- ⏱️ No timeout limits (unlike Edge Functions)
- 🔄 Async processing with status updates

## Quick Start

### Local Development

1. **Copy environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual keys
   ```

2. **Build and run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

3. **Test the service:**
   ```bash
   # Health check
   curl http://localhost:8080/health

   # Generate a test video
   curl -X POST http://localhost:8080/generate \
     -H "Content-Type: application/json" \
     -d '{
       "deckId": "test-deck-123",
       "slideNumber": 1,
       "prompt": "A simple animation showing a person sitting at a desk, papers falling around them",
       "resolution": "540p"
     }'
   ```

## Deployment Options

### Option 1: Google Cloud Run (Recommended)

```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/video-generation-service

# Deploy to Cloud Run
gcloud run deploy video-generation-service \
  --image gcr.io/YOUR_PROJECT_ID/video-generation-service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars FAL_KEY=${FAL_KEY},SUPABASE_URL=${SUPABASE_URL},SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
```

### Option 2: Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch app
fly launch

# Set secrets
fly secrets set FAL_KEY=your_key_here
fly secrets set SUPABASE_URL=your_url_here
fly secrets set SUPABASE_SERVICE_ROLE_KEY=your_key_here

# Deploy
fly deploy
```

### Option 3: Railway

1. Connect your GitHub repo to Railway
2. Add environment variables in Railway dashboard
3. Deploy automatically on push

## API Endpoints

### `POST /generate`

Generate a video for a pitch deck slide.

**Request:**
```json
{
  "deckId": "abc123",
  "slideNumber": 1,
  "prompt": "Detailed animation description...",
  "resolution": "540p"
}
```

**Response (Success):**
```json
{
  "success": true,
  "videoUrl": "https://fskwutnoxbbflzqrphro.supabase.co/storage/v1/object/public/pitch-deck-videos/abc123-slide-1.mp4",
  "duration": 8
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message"
}
```

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "video-generation"
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `FAL_KEY` | Fal.ai API key | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `PORT` | Server port (default: 8080) | No |

## Integration

Once deployed, update your generate-pitch-deck Edge Function to call this service:

```typescript
// After returning pitch deck to user, trigger async video generation
const videoServiceUrl = 'https://your-video-service.run.app';

for (const slide of pitchDeck.slides) {
  if (slide.videoPrompt) {
    fetch(`${videoServiceUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deckId: pitchDeck.id,
        slideNumber: slide.slideNumber,
        prompt: slide.videoPrompt,
        resolution: '540p',
      }),
    }).catch(console.error); // Fire and forget
  }
}
```

## Monitoring

Check logs:
- **Docker Compose**: `docker-compose logs -f`
- **Cloud Run**: `gcloud run services logs read video-generation-service`
- **Fly.io**: `fly logs`

## Cost Optimization

- Use `540p` resolution for lowest cost ($0.05/video)
- Use `720p` for better quality ($0.10/video)
- Use `1080p` only when necessary ($0.20/video)

## Troubleshooting

**Service won't start:**
- Check environment variables are set correctly
- Verify Fal.ai API key is valid
- Ensure Supabase credentials are correct

**Videos not uploading:**
- Check Supabase Storage bucket exists (`pitch-deck-videos`)
- Verify bucket has public access enabled
- Check RLS policies allow service role to upload

**Slow generation:**
- Fal.ai typically takes 20-40s per video
- Consider using lower resolution for faster generation
- Check your Fal.ai account quota
