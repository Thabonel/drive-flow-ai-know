-- Microsoft OneDrive/SharePoint Integration Tables and Functions

-- Table to store encrypted Microsoft OAuth tokens
CREATE TABLE IF NOT EXISTS public.user_microsoft_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_access_token BYTEA NOT NULL,
  encrypted_refresh_token BYTEA,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Audit log for Microsoft token access
CREATE TABLE IF NOT EXISTS public.microsoft_token_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate limiting for Microsoft token access
CREATE TABLE IF NOT EXISTS public.microsoft_token_rate_limit (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Microsoft Drive folders table
CREATE TABLE IF NOT EXISTS public.microsoft_drive_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drive_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  folder_path TEXT,
  drive_type TEXT, -- personal, business, sharepoint
  site_id TEXT, -- for SharePoint
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, drive_id, item_id)
);

-- Enable RLS
ALTER TABLE public.user_microsoft_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.microsoft_token_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.microsoft_token_rate_limit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.microsoft_drive_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_microsoft_tokens
CREATE POLICY "Users can view their own Microsoft tokens"
  ON public.user_microsoft_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage Microsoft tokens"
  ON public.user_microsoft_tokens FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for microsoft_drive_folders
CREATE POLICY "Users can view their own Microsoft folders"
  ON public.microsoft_drive_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Microsoft folders"
  ON public.microsoft_drive_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Microsoft folders"
  ON public.microsoft_drive_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Microsoft folders"
  ON public.microsoft_drive_folders FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for audit log
CREATE POLICY "Users can view their own Microsoft audit logs"
  ON public.microsoft_token_audit_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert Microsoft audit logs"
  ON public.microsoft_token_audit_log FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for rate limit
CREATE POLICY "Users can view their own Microsoft rate limit"
  ON public.microsoft_token_rate_limit FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage Microsoft rate limits"
  ON public.microsoft_token_rate_limit FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_microsoft_tokens_user_id ON public.user_microsoft_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_microsoft_tokens_expires_at ON public.user_microsoft_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_microsoft_audit_user_id ON public.microsoft_token_audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_microsoft_folders_user_id ON public.microsoft_drive_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_microsoft_folders_active ON public.microsoft_drive_folders(user_id, is_active);

-- Function to store encrypted Microsoft tokens
CREATE OR REPLACE FUNCTION store_encrypted_microsoft_token(
  p_user_id UUID,
  p_access_token TEXT,
  p_refresh_token TEXT,
  p_token_type TEXT,
  p_expires_at TIMESTAMP WITH TIME ZONE,
  p_scope TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
  v_result JSONB;
BEGIN
  -- Get encryption key
  encryption_key := current_setting('app.microsoft_token_encryption_key', true);

  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Microsoft token encryption key not configured';
  END IF;

  -- Upsert encrypted tokens
  INSERT INTO public.user_microsoft_tokens (
    user_id,
    encrypted_access_token,
    encrypted_refresh_token,
    token_type,
    expires_at,
    scope,
    updated_at
  ) VALUES (
    p_user_id,
    pgp_sym_encrypt(p_access_token, encryption_key),
    CASE WHEN p_refresh_token IS NOT NULL
      THEN pgp_sym_encrypt(p_refresh_token, encryption_key)
      ELSE NULL
    END,
    p_token_type,
    p_expires_at,
    p_scope,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    encrypted_access_token = pgp_sym_encrypt(p_access_token, encryption_key),
    encrypted_refresh_token = CASE WHEN p_refresh_token IS NOT NULL
      THEN pgp_sym_encrypt(p_refresh_token, encryption_key)
      ELSE user_microsoft_tokens.encrypted_refresh_token
    END,
    token_type = p_token_type,
    expires_at = p_expires_at,
    scope = p_scope,
    updated_at = NOW();

  -- Log the action
  INSERT INTO public.microsoft_token_audit_log (
    user_id,
    action,
    success,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    'store',
    true,
    jsonb_build_object(
      'token_type', p_token_type,
      'scope', p_scope,
      'expires_at', p_expires_at
    ),
    p_ip_address,
    p_user_agent
  );

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Microsoft tokens stored successfully'
  );

  RETURN v_result;
END;
$$;

-- Function to get decrypted Microsoft tokens
CREATE OR REPLACE FUNCTION get_decrypted_microsoft_token(
  p_user_id UUID,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE(
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  token_type TEXT,
  scope TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
  token_record RECORD;
  v_rate_limit RECORD;
BEGIN
  -- Check rate limiting
  SELECT * INTO v_rate_limit
  FROM public.microsoft_token_rate_limit
  WHERE user_id = p_user_id;

  IF v_rate_limit IS NOT NULL THEN
    -- Reset counter if window expired (1 hour)
    IF v_rate_limit.window_start < NOW() - INTERVAL '1 hour' THEN
      UPDATE public.microsoft_token_rate_limit
      SET access_count = 1,
          window_start = NOW(),
          blocked_until = NULL,
          updated_at = NOW()
      WHERE user_id = p_user_id;
    -- Check if blocked
    ELSIF v_rate_limit.blocked_until IS NOT NULL AND v_rate_limit.blocked_until > NOW() THEN
      RAISE EXCEPTION 'Rate limit exceeded. Try again later.';
    -- Increment counter
    ELSIF v_rate_limit.access_count >= 100 THEN
      UPDATE public.microsoft_token_rate_limit
      SET blocked_until = NOW() + INTERVAL '1 hour',
          updated_at = NOW()
      WHERE user_id = p_user_id;
      RAISE EXCEPTION 'Rate limit exceeded (100 accesses per hour)';
    ELSE
      UPDATE public.microsoft_token_rate_limit
      SET access_count = access_count + 1,
          updated_at = NOW()
      WHERE user_id = p_user_id;
    END IF;
  ELSE
    -- First access, create rate limit record
    INSERT INTO public.microsoft_token_rate_limit (user_id, access_count, window_start)
    VALUES (p_user_id, 1, NOW());
  END IF;

  -- Get encryption key
  encryption_key := current_setting('app.microsoft_token_encryption_key', true);

  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Microsoft token encryption key not configured';
  END IF;

  -- Get token record
  SELECT
    encrypted_access_token,
    encrypted_refresh_token,
    t.expires_at,
    t.token_type,
    t.scope
  INTO token_record
  FROM public.user_microsoft_tokens t
  WHERE t.user_id = p_user_id
    AND t.expires_at > NOW();

  IF token_record IS NULL THEN
    -- Log failed retrieval
    INSERT INTO public.microsoft_token_audit_log (
      user_id,
      action,
      success,
      details,
      ip_address,
      user_agent
    ) VALUES (
      p_user_id,
      'retrieve',
      false,
      jsonb_build_object('reason', 'no_valid_tokens'),
      p_ip_address,
      p_user_agent
    );

    RAISE EXCEPTION 'No valid Microsoft tokens found';
  END IF;

  -- Log successful retrieval
  INSERT INTO public.microsoft_token_audit_log (
    user_id,
    action,
    success,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    'retrieve',
    true,
    jsonb_build_object('token_type', token_record.token_type),
    p_ip_address,
    p_user_agent
  );

  -- Return decrypted tokens
  RETURN QUERY SELECT
    pgp_sym_decrypt(token_record.encrypted_access_token, encryption_key),
    CASE WHEN token_record.encrypted_refresh_token IS NOT NULL
         THEN pgp_sym_decrypt(token_record.encrypted_refresh_token, encryption_key)
         ELSE NULL END,
    token_record.expires_at,
    token_record.token_type,
    token_record.scope;
END;
$$;

-- Trigger for updated_at on microsoft tokens
CREATE TRIGGER update_microsoft_tokens_updated_at
  BEFORE UPDATE ON public.user_microsoft_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on microsoft folders
CREATE TRIGGER update_microsoft_folders_updated_at
  BEFORE UPDATE ON public.microsoft_drive_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on rate limit
CREATE TRIGGER update_microsoft_rate_limit_updated_at
  BEFORE UPDATE ON public.microsoft_token_rate_limit
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
