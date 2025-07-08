-- Create table for storing user preferences
CREATE TABLE public.user_settings (
  user_id UUID NOT NULL PRIMARY KEY,
  model_preference TEXT NOT NULL DEFAULT 'openai',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own settings
CREATE POLICY "Users can manage their own settings"
ON public.user_settings
FOR ALL
USING (auth.uid() = user_id);

-- Trigger to update updated_at automatically
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

