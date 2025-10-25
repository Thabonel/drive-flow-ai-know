-- Add admin role to thabonel0@gmail.com
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
