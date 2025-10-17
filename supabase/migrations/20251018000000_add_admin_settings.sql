-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin settings
CREATE POLICY "Admins can view admin settings"
  ON admin_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Only admins can update admin settings
CREATE POLICY "Admins can update admin settings"
  ON admin_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Only admins can insert admin settings
CREATE POLICY "Admins can insert admin settings"
  ON admin_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create function to upsert admin settings
CREATE OR REPLACE FUNCTION upsert_admin_setting(
  p_setting_key text,
  p_setting_value jsonb
)
RETURNS admin_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result admin_settings;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can update settings';
  END IF;

  -- Upsert the setting
  INSERT INTO admin_settings (setting_key, setting_value, updated_by)
  VALUES (p_setting_key, p_setting_value, auth.uid())
  ON CONFLICT (setting_key)
  DO UPDATE SET
    setting_value = p_setting_value,
    updated_by = auth.uid(),
    updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- Insert default admin settings
INSERT INTO admin_settings (setting_key, setting_value) VALUES
  ('maintenance_mode', 'false'::jsonb),
  ('signups_enabled', 'true'::jsonb),
  ('email_verification_required', 'false'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS admin_settings_key_idx ON admin_settings(setting_key);
