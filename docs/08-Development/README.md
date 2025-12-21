# Development Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Common Tasks](#common-tasks)
4. [Testing](#testing)
5. [Deployment](#deployment)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Getting Started

### Prerequisites

- **Node.js**: 18+ (LTS recommended)
- **npm**: 9+
- **Supabase CLI**: Latest
- **Git**: Latest
- **Code Editor**: VS Code recommended

### Initial Setup

**1. Clone Repository**:
```bash
git clone https://github.com/your-org/aiqueryhub.git
cd aiqueryhub
```

**2. Install Dependencies**:
```bash
npm install
```

**3. Environment Setup**:

Create `.env` file in root:
```bash
VITE_SUPABASE_URL=https://fskwutnoxbbflzqrphro.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

**4. Start Development Server**:
```bash
npm run dev
```

Application runs on `http://localhost:8080`

---

## Development Workflow

### Frontend Development

**File Structure**:
```
src/
├── pages/           # Add new pages here
├── components/      # Add new components here
├── hooks/           # Add custom hooks here
├── lib/             # Add utilities here
└── integrations/    # External integrations
```

**Adding a New Page**:

1. Create page component:
```tsx
// src/pages/NewFeature.tsx
export default function NewFeature() {
  return (
    <div>
      <h1>New Feature</h1>
    </div>
  );
}
```

2. Add route in `src/App.tsx`:
```tsx
import NewFeature from './pages/NewFeature';

// Inside <Routes>
<Route path="/new-feature" element={
  <ProtectedRoute>
    <NewFeature />
  </ProtectedRoute>
} />
```

3. Add navigation link in `src/components/AppSidebar.tsx`:
```tsx
<SidebarMenuItem>
  <Link to="/new-feature">New Feature</Link>
</SidebarMenuItem>
```

**Adding a New Component**:

```tsx
// src/components/MyComponent.tsx
import { Button } from '@/components/ui/button';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export default function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <div className="p-4">
      <h2>{title}</h2>
      <Button onClick={onAction}>Action</Button>
    </div>
  );
}
```

**Creating a Custom Hook**:

```typescript
// src/hooks/useMyFeature.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useMyFeature() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('my_table')
      .select('*');

    if (error) {
      console.error(error);
    } else {
      setData(data || []);
    }
    setLoading(false);
  };

  return { data, loading, refetch: fetchData };
}
```

---

### Backend Development

**Adding Edge Function**:

```bash
# Create new function
supabase functions new my-function
```

```typescript
// supabase/functions/my-function/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token!);

    if (error || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request
    const body = await req.json();

    // Business logic here
    const result = { message: 'Success' };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
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

**Deploy Function**:
```bash
supabase functions deploy my-function
```

**Set Environment Variables**:
```bash
supabase secrets set MY_API_KEY=value
```

---

### Database Development

**Creating a Migration**:

```bash
# Generate migration file
supabase migration new create_my_table
```

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_create_my_table.sql

-- Create table
CREATE TABLE my_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own records"
ON my_table FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
ON my_table FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records"
ON my_table FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own records"
ON my_table FOR DELETE
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_my_table_user_id ON my_table(user_id);
CREATE INDEX idx_my_table_created_at ON my_table(created_at DESC);
```

**Apply Migration Locally**:
```bash
supabase db reset  # Resets local DB and applies all migrations
```

**Apply Migration to Production**:
```bash
supabase db push
```

**Generate TypeScript Types**:
```bash
npm run types:generate
```

This updates `src/integrations/supabase/types.ts`

---

## Common Tasks

### Add New AI Model

**1. Update Model Configuration**:

```typescript
// supabase/functions/_shared/models.ts

export const CLAUDE_MODELS = {
  PRIMARY: Deno.env.get('CLAUDE_PRIMARY_MODEL') || 'claude-opus-4-5',
  FAST: Deno.env.get('CLAUDE_FAST_MODEL') || 'claude-sonnet-4-5',
  CHEAP: Deno.env.get('CLAUDE_CHEAP_MODEL') || 'claude-haiku-4-5',
  NEW: 'claude-new-model',  // Add new model
};
```

**2. Use in Edge Function**:

```typescript
import { CLAUDE_MODELS } from '../_shared/models.ts';

// Use new model
model: CLAUDE_MODELS.NEW
```

**3. Override via Environment Variable** (preferred):

```bash
supabase secrets set CLAUDE_NEW_MODEL=claude-new-model-id
```

---

### Add External Integration

**1. Add OAuth Flow** (if needed):

```typescript
// src/hooks/useNewService.ts

export function useNewService() {
  const connectService = async () => {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${window.location.origin}/auth/newservice/callback`,
      response_type: 'code',
      scope: 'read write',
    });

    window.location.href = `https://service.com/oauth/authorize?${params}`;
  };

  return { connectService };
}
```

**2. Create Callback Page**:

```tsx
// src/pages/auth/NewServiceCallback.tsx

export default function NewServiceCallback() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');

    if (code) {
      // Exchange code for tokens via Edge Function
      supabase.functions.invoke('store-newservice-tokens', {
        body: { code }
      });
    }
  }, []);

  return <div>Connecting...</div>;
}
```

**3. Create Token Storage Table**:

```sql
CREATE TABLE user_newservice_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**4. Create Edge Function**:

```typescript
// supabase/functions/newservice-sync/index.ts

serve(async (req) => {
  // Fetch user's tokens
  const { data: tokens } = await supabase
    .from('user_newservice_tokens')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Call external API
  const response = await fetch('https://api.service.com/data', {
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`
    }
  });

  // Process and store data
  // ...
});
```

---

### Modify Theme Colors

**File**: `src/index.css`

```css
:root {
  /* Primary color (navy) */
  --primary: 213 74% 15%;
  --primary-foreground: 0 0% 100%;

  /* Accent color (gold) */
  --accent: 46 100% 50%;
  --accent-foreground: 213 74% 15%;

  /* Add new color */
  --my-color: 200 100% 40%;
  --my-color-foreground: 0 0% 100%;
}
```

**Use in Components**:

```tsx
<div className="bg-[hsl(var(--my-color))] text-[hsl(var(--my-color-foreground))]">
  Custom Color
</div>
```

---

## Testing

### Manual Testing

**Development Server**:
```bash
npm run dev
```

Visit `http://localhost:8080`

**Production Build Test**:
```bash
npm run build
npm run preview
```

### Edge Function Testing

**Local Supabase**:
```bash
supabase start
supabase functions serve
```

**Test with curl**:
```bash
curl -X POST http://localhost:54321/functions/v1/my-function \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

### Database Testing

**Local DB**:
```bash
supabase start
psql postgresql://postgres:postgres@localhost:54322/postgres
```

**Run Queries**:
```sql
SELECT * FROM timeline_items WHERE user_id = 'xxx';
```

---

## Deployment

### Frontend Deployment

**Build**:
```bash
npm run build
```

Output: `dist/` directory

**Deploy to Vercel**:
```bash
vercel deploy
```

**Deploy to Netlify**:
```bash
netlify deploy --prod
```

**Environment Variables**:
Set in hosting platform dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

### Backend Deployment

**Deploy All Functions**:
```bash
supabase functions deploy
```

**Deploy Single Function**:
```bash
supabase functions deploy ai-query
```

**Set Secrets**:
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-...
supabase secrets set GEMINI_API_KEY=...
supabase secrets set OPENROUTER_API_KEY=...
supabase secrets set BRAVE_SEARCH_API_KEY=...
```

**View Logs**:
```bash
supabase functions logs ai-query --tail
```

---

### Database Deployment

**Apply Migrations**:
```bash
supabase db push
```

**Rollback** (if needed):
```bash
supabase db reset --db-url postgresql://...
```

---

## Troubleshooting

### Common Issues

**1. "Module not found" Error**:

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**2. "Supabase client error"**:

Check `.env` file has correct URL and key:
```bash
cat .env
```

**3. "Edge Function timeout"**:

Increase timeout or optimize function:
```typescript
// Add timeout handling
const controller = new AbortController();
setTimeout(() => controller.abort(), 25000);  // 25s (< 30s limit)

fetch(url, { signal: controller.signal });
```

**4. "RLS policy error"**:

Check if RLS is enabled and policies exist:
```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'my_table';

-- List policies
SELECT * FROM pg_policies WHERE tablename = 'my_table';
```

**5. "CORS error"**:

Ensure Edge Function includes CORS headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**6. "Type errors after DB changes"**:

Regenerate types:
```bash
npm run types:generate
```

---

## Best Practices

### Code Style

**1. Use TypeScript**:
```typescript
// Good
interface User {
  id: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// Avoid
function getUser(id) {  // No type info
  // ...
}
```

**2. Extract Reusable Logic**:
```typescript
// Bad - duplicate code
const users = await supabase.from('users').select('*').eq('active', true);
const docs = await supabase.from('docs').select('*').eq('active', true);

// Good - reusable function
function fetchActive<T>(table: string): Promise<T[]> {
  return supabase.from(table).select('*').eq('active', true);
}
```

**3. Use Async/Await**:
```typescript
// Good
async function fetchData() {
  const data = await supabase.from('table').select('*');
  return data;
}

// Avoid
function fetchData() {
  return supabase.from('table').select('*').then(data => data);
}
```

**4. Handle Errors**:
```typescript
// Good
try {
  const { data, error } = await supabase.from('table').select('*');
  if (error) throw error;
  return data;
} catch (error) {
  console.error('Failed to fetch:', error);
  toast.error('Failed to load data');
  return [];
}

// Bad
const { data } = await supabase.from('table').select('*');
return data;  // No error handling
```

**5. Use Tailwind Classes**:
```tsx
// Good
<div className="flex items-center gap-4 p-6 bg-primary text-white rounded-lg">
  Content
</div>

// Avoid inline styles
<div style={{ display: 'flex', padding: '24px' }}>
  Content
</div>
```

---

### Performance

**1. Minimize Re-renders**:
```tsx
// Use React.memo for expensive components
export default React.memo(MyComponent);

// Use useMemo for expensive calculations
const sortedData = useMemo(() => {
  return data.sort((a, b) => a.name.localeCompare(b.name));
}, [data]);

// Use useCallback for functions passed to children
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);
```

**2. Lazy Load Routes**:
```tsx
import { lazy, Suspense } from 'react';

const PitchDeck = lazy(() => import('./pages/PitchDeck'));

<Route path="/pitch-deck" element={
  <Suspense fallback={<Loading />}>
    <PitchDeck />
  </Suspense>
} />
```

**3. Optimize Database Queries**:
```typescript
// Bad - fetches all columns
const { data } = await supabase.from('documents').select('*');

// Good - only fetch needed columns
const { data } = await supabase
  .from('documents')
  .select('id, title, created_at')
  .limit(20);
```

**4. Use Indexes**:
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_documents_user_created ON documents(user_id, created_at DESC);
```

---

### Security

**1. Validate Input**:
```typescript
// Good
if (!email || !email.includes('@')) {
  throw new Error('Invalid email');
}

// Use Zod for complex validation
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const validated = schema.parse(input);
```

**2. Never Expose Secrets**:
```typescript
// Bad
const apiKey = 'sk-1234567890';

// Good
const apiKey = Deno.env.get('API_KEY');
```

**3. Use RLS Policies**:
```sql
-- Always enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users see own data"
ON my_table FOR SELECT
USING (auth.uid() = user_id);
```

**4. Sanitize User Input**:
```typescript
// React automatically escapes, but be careful with dangerouslySetInnerHTML
// Never do this with user input:
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// Safe:
<div>{userInput}</div>
```

---

## Resources

**Official Documentation**:
- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase](https://supabase.com/docs)
- [Anthropic Claude](https://docs.anthropic.com)
- [Google Gemini](https://ai.google.dev/gemini-api/docs)

**Community**:
- [Supabase Discord](https://discord.supabase.com)
- [React Discord](https://discord.gg/react)

---

**Congratulations!** You now have a comprehensive understanding of the AI Query Hub codebase.

For specific questions, refer to the relevant documentation section or consult the code directly.
