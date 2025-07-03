-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create google_drive_folders table
CREATE TABLE public.google_drive_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  folder_path TEXT,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, folder_id)
);

-- Create documents table
CREATE TABLE public.knowledge_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.google_drive_folders(id) ON DELETE CASCADE,
  google_file_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  drive_created_at TIMESTAMP WITH TIME ZONE,
  drive_modified_at TIMESTAMP WITH TIME ZONE,
  is_archived BOOLEAN DEFAULT false,
  is_outdated BOOLEAN DEFAULT false,
  category TEXT,
  tags TEXT[],
  ai_summary TEXT,
  ai_insights JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, google_file_id)
);

-- Create knowledge_bases table for synthesized content
CREATE TABLE public.knowledge_bases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('prompts', 'specs', 'marketing', 'general')),
  content JSONB NOT NULL DEFAULT '{}',
  source_document_ids UUID[],
  ai_generated_content TEXT,
  is_active BOOLEAN DEFAULT true,
  last_updated_from_source TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sync_jobs table
CREATE TABLE public.sync_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.google_drive_folders(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  files_processed INTEGER DEFAULT 0,
  files_total INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_drive_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own folders" ON public.google_drive_folders FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own documents" ON public.knowledge_documents FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own knowledge bases" ON public.knowledge_bases FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own sync jobs" ON public.sync_jobs FOR ALL USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_google_drive_folders_updated_at BEFORE UPDATE ON public.google_drive_folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_knowledge_documents_updated_at BEFORE UPDATE ON public.knowledge_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_knowledge_bases_updated_at BEFORE UPDATE ON public.knowledge_bases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();