-- Step 1: Add admin access policies for support tickets
CREATE POLICY "Admins can view all tickets"
  ON support_tickets
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all tickets"
  ON support_tickets
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Step 2: Grant admin role to thabonel0@gmail.com
-- First, find your user_id (this will display your user ID)
SELECT id, email FROM auth.users WHERE email = 'thabonel0@gmail.com';

-- Insert admin role (you'll need to replace YOUR_USER_ID with the ID shown above)
-- Or run the following which does it automatically:
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'thabonel0@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify admin role was added
SELECT u.email, ur.role, ur.created_at
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'thabonel0@gmail.com';
