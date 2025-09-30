-- Create enum for server protocol types
CREATE TYPE server_protocol AS ENUM (
  'smb_cifs',
  'nfs',
  'sftp',
  'ftp',
  'webdav',
  's3',
  'azure_files',
  'azure_blob'
);

-- Create enum for authentication methods
CREATE TYPE auth_method AS ENUM (
  'username_password',
  'ssh_key',
  'oauth',
  'api_key',
  'certificate',
  'active_directory'
);

-- Create table for enterprise server configurations
CREATE TABLE enterprise_server_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  protocol server_protocol NOT NULL,
  host TEXT NOT NULL,
  port INTEGER,
  auth_method auth_method NOT NULL,
  encrypted_credentials BYTEA,
  encryption_config JSONB DEFAULT '{}',
  security_settings JSONB DEFAULT '{}',
  compliance_standards TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_connection_test TIMESTAMP WITH TIME ZONE,
  connection_status TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE enterprise_server_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own server configs"
  ON enterprise_server_configs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own server configs"
  ON enterprise_server_configs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own server configs"
  ON enterprise_server_configs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own server configs"
  ON enterprise_server_configs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create audit log table for enterprise server access
CREATE TABLE enterprise_server_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_id UUID REFERENCES enterprise_server_configs(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE enterprise_server_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit log
CREATE POLICY "Users can view their own audit logs"
  ON enterprise_server_audit_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert audit logs"
  ON enterprise_server_audit_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_enterprise_server_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER enterprise_server_configs_updated_at
  BEFORE UPDATE ON enterprise_server_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_enterprise_server_updated_at();

-- Create function to encrypt server credentials
CREATE OR REPLACE FUNCTION store_encrypted_server_credentials(
  p_config_id UUID,
  p_credentials TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := current_setting('app.server_credentials_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Server credentials encryption key not configured';
  END IF;

  UPDATE enterprise_server_configs
  SET encrypted_credentials = pgp_sym_encrypt(p_credentials, encryption_key)
  WHERE id = p_config_id AND user_id = auth.uid();
END;
$$;

-- Create function to decrypt server credentials
CREATE OR REPLACE FUNCTION get_decrypted_server_credentials(
  p_config_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
  encrypted_data BYTEA;
BEGIN
  encryption_key := current_setting('app.server_credentials_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Server credentials encryption key not configured';
  END IF;

  SELECT encrypted_credentials INTO encrypted_data
  FROM enterprise_server_configs
  WHERE id = p_config_id AND user_id = auth.uid();

  IF encrypted_data IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN pgp_sym_decrypt(encrypted_data, encryption_key);
END;
$$;