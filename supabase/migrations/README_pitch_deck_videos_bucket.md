# Pitch Deck Videos Storage Bucket Setup

## Overview
This document describes the configuration for the `pitch-deck-videos` Supabase Storage bucket, which stores rendered MP4 videos for pitch deck narrative animations.

## Bucket Configuration

**Bucket Name**: `pitch-deck-videos`

**Purpose**: Store rendered Remotion MP4 videos for pitch deck slides

**Access**: Public read (videos need to be accessible in presentations)

**File Types**: MP4 video files, TSX animation scripts

## Setup Instructions

### Option 1: Supabase Dashboard (Recommended)

1. **Navigate to Storage**:
   - Go to https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro
   - Click "Storage" in the left sidebar

2. **Create Bucket**:
   - Click "Create a new bucket"
   - Bucket name: `pitch-deck-videos`
   - Public bucket: **YES** (enable public access)
   - File size limit: 10 MB (default)
   - Allowed MIME types: Leave empty (allow all)

3. **Configure Bucket Settings**:
   - Click on the `pitch-deck-videos` bucket
   - Go to "Configuration" tab
   - **Public**: Enabled ✅
   - **File size limit**: 10 MB
   - **Allowed MIME types**: `video/mp4, text/typescript` (or leave empty for all)

4. **Set up CORS (if needed)**:
   - Go to "Configuration" → "CORS"
   - Add allowed origin: `*` (or specific domain)
   - Allowed methods: `GET, POST, PUT, DELETE`

### Option 2: SQL Migration (Alternative)

If you prefer to create the bucket via SQL, you can use this migration:

```sql
-- Create pitch-deck-videos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pitch-deck-videos',
  'pitch-deck-videos',
  true,  -- Public access
  10485760,  -- 10 MB limit
  ARRAY['video/mp4', 'text/typescript']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the bucket
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pitch-deck-videos');

-- Allow authenticated users to update their own videos
CREATE POLICY "Users can update their own videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'pitch-deck-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own videos
CREATE POLICY "Users can delete their own videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'pitch-deck-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access (required for video playback)
CREATE POLICY "Public read access for videos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'pitch-deck-videos');
```

## File Naming Convention

**Rendered Videos**:
```
{pitchDeckId}-slide-{slideNumber}.mp4

Examples:
- 123e4567-e89b-12d3-a456-426614174000-slide-1.mp4
- 123e4567-e89b-12d3-a456-426614174000-slide-2.mp4
```

**Animation Scripts** (TSX code for future rendering):
```
{pitchDeckId}-slide-{slideNumber}-animation-script.tsx

Examples:
- 123e4567-e89b-12d3-a456-426614174000-slide-1-animation-script.tsx
- 123e4567-e89b-12d3-a456-426614174000-slide-2-animation-script.tsx
```

## Usage Example

### Upload Video (from Edge Function)
```typescript
const { data, error } = await supabase.storage
  .from('pitch-deck-videos')
  .upload(`${slideId}.mp4`, videoFile, {
    contentType: 'video/mp4',
    cacheControl: '3600',  // Cache for 1 hour
    upsert: true,          // Overwrite if exists
  });

if (error) {
  console.error('Upload failed:', error);
} else {
  console.log('Video uploaded:', data.path);
}
```

### Get Public URL
```typescript
const { data: { publicUrl } } = supabase.storage
  .from('pitch-deck-videos')
  .getPublicUrl(`${slideId}.mp4`);

console.log('Video URL:', publicUrl);
// Example: https://fskwutnoxbbflzqrphro.supabase.co/storage/v1/object/public/pitch-deck-videos/123e4567-slide-1.mp4
```

### Delete Video (cleanup)
```typescript
const { error } = await supabase.storage
  .from('pitch-deck-videos')
  .remove([`${slideId}.mp4`]);

if (error) {
  console.error('Delete failed:', error);
} else {
  console.log('Video deleted');
}
```

## Storage Quotas and Costs

### Supabase Free Tier
- **Storage**: 1 GB
- **Bandwidth**: 2 GB/month
- **Estimated capacity**: ~200 videos @ 5MB each

### Pro Tier ($25/month)
- **Storage**: 100 GB
- **Bandwidth**: 200 GB/month
- **Estimated capacity**: ~20,000 videos @ 5MB each

### Cost Optimization

1. **Compress videos**: Target <5MB per slide
   - Use H.264 codec with optimized settings
   - 1920x1080 @ 30fps, 5-8 seconds
   - Expected size: 3-5 MB per video

2. **Cache rendered videos**: Don't re-render unchanged slides
   - Store video URL in pitch deck data
   - Only re-render if animation script changes

3. **Cleanup old videos**: Delete videos when pitch deck is deleted
   - Implement cascade delete trigger
   - Or periodic cleanup job

4. **Monitor usage**: Track storage and bandwidth
   - Supabase dashboard → Settings → Usage
   - Set up alerts for quota limits

## Monitoring and Maintenance

### Check Bucket Size
```sql
SELECT
  bucket_id,
  count(*) as file_count,
  pg_size_pretty(sum((metadata->>'size')::int)) as total_size
FROM storage.objects
WHERE bucket_id = 'pitch-deck-videos'
GROUP BY bucket_id;
```

### List Large Files
```sql
SELECT
  name,
  pg_size_pretty((metadata->>'size')::int) as size,
  created_at
FROM storage.objects
WHERE bucket_id = 'pitch-deck-videos'
ORDER BY (metadata->>'size')::int DESC
LIMIT 20;
```

### Find Orphaned Videos (no associated pitch deck)
```sql
-- TODO: Implement after pitch deck metadata is stored in database
-- This query would find videos without corresponding pitch deck records
```

## Troubleshooting

### Video Not Loading (404)
- Check if file exists in storage bucket
- Verify bucket is set to public
- Check CORS configuration
- Ensure video URL is correct format

### Upload Fails (403 Forbidden)
- Verify user is authenticated
- Check storage policies allow upload
- Verify file size is within limits
- Check MIME type is allowed

### Video Playback Issues
- Verify video codec (must be H.264 for browser compatibility)
- Check video resolution (1920x1080 recommended)
- Test in multiple browsers (Chrome, Safari, Firefox)
- Check CDN caching (may need to clear cache)

## Next Steps

1. **Create bucket via Supabase dashboard** (Option 1 above)
2. **Test upload/download** from `render-remotion-video` Edge Function
3. **Verify public access** works for video playback
4. **Set up monitoring** for storage usage
5. **Implement cleanup** logic for deleted pitch decks

## Related Documentation

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage Policies Guide](https://supabase.com/docs/guides/storage/security/access-control)
- [Remotion Video Generation PRD](../../docs/PRD-remotion-narrative-video-generation.md)
- [Implementation Plan](../../.claude/plans/stateless-snuggling-forest.md)
