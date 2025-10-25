-- Add admin access policy for support tickets
-- This allows users with the 'admin' role to view and manage all support tickets

CREATE POLICY "Admins can view all tickets"
  ON support_tickets
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all tickets"
  ON support_tickets
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add comment for documentation
COMMENT ON POLICY "Admins can view all tickets" ON support_tickets IS 'Allows admin users to view all support tickets';
COMMENT ON POLICY "Admins can update all tickets" ON support_tickets IS 'Allows admin users to update any support ticket';
