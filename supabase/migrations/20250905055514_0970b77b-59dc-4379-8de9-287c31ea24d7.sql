-- Fix critical RLS policy for doc_qa_documents to prevent data leakage
-- Remove the dangerous "agent_id IS NULL => true" public access path

DROP POLICY IF EXISTS "Users can view documents via agent membership" ON doc_qa_documents;

-- Create secure policy that only allows document owners to view their chunks
CREATE POLICY "Users can view their own document chunks" 
ON doc_qa_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM knowledge_documents kd 
    WHERE kd.id::text = doc_qa_documents.document_id 
    AND kd.user_id = auth.uid()
  )
);

-- Fix multi-tenant data exposure issues
-- Add user_id columns to project_notes and project_memory if they don't exist

-- For project_notes - add user_id column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_notes' AND column_name = 'user_id') THEN
    ALTER TABLE project_notes ADD COLUMN user_id UUID REFERENCES auth.users NOT NULL DEFAULT auth.uid();
  END IF;
END $$;

-- For project_memory - add user_id column if missing  
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_memory' AND column_name = 'user_id') THEN
    ALTER TABLE project_memory ADD COLUMN user_id UUID REFERENCES auth.users NOT NULL DEFAULT auth.uid();
  END IF;
END $$;

-- Update RLS policies for project_notes
DROP POLICY IF EXISTS "Authenticated users can manage project notes" ON project_notes;
DROP POLICY IF EXISTS "Users can view all project notes" ON project_notes;

CREATE POLICY "Users can manage their own project notes" 
ON project_notes 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update RLS policies for project_memory  
DROP POLICY IF EXISTS "Authenticated users can manage project memory" ON project_memory;
DROP POLICY IF EXISTS "Users can view all project memory" ON project_memory;

CREATE POLICY "Users can manage their own project memory" 
ON project_memory 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add user_id to agents table if missing and fix RLS
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'user_id') THEN
    ALTER TABLE agents ADD COLUMN user_id UUID REFERENCES auth.users;
  END IF;
END $$;

-- Update agents RLS policy
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON agents;

CREATE POLICY "Users can manage their own agents" 
ON agents 
FOR ALL 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

-- Add user_id to projects table if missing and fix RLS
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'user_id') THEN
    ALTER TABLE projects ADD COLUMN user_id UUID REFERENCES auth.users;
  END IF;
END $$;

-- Update projects RLS policy
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON projects;

CREATE POLICY "Users can manage their own projects" 
ON projects 
FOR ALL 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

-- Add user_id to conversations table if missing and fix RLS
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'user_id') THEN
    ALTER TABLE conversations ADD COLUMN user_id UUID REFERENCES auth.users;
  END IF;
END $$;

-- Update conversations RLS policy
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON conversations;

CREATE POLICY "Users can manage their own conversations" 
ON conversations 
FOR ALL 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

-- Add user_id to messages table if missing and fix RLS
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'user_id') THEN
    ALTER TABLE messages ADD COLUMN user_id UUID REFERENCES auth.users;
  END IF;
END $$;

-- Update messages RLS policy
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON messages;

CREATE POLICY "Users can manage their own messages" 
ON messages 
FOR ALL 
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

-- Improve workspace API token security
-- Add security columns to workspace_api_keys if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_api_keys' AND column_name = 'token_hash') THEN
    ALTER TABLE workspace_api_keys ADD COLUMN token_hash TEXT;
    ALTER TABLE workspace_api_keys ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE workspace_api_keys ADD COLUMN last_used_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE workspace_api_keys ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE workspace_api_keys ADD COLUMN revoked BOOLEAN DEFAULT FALSE;
    ALTER TABLE workspace_api_keys ADD COLUMN scopes JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Fix search_path issues for functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;