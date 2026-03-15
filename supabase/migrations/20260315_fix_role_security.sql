-- Migration: Fix role escalation vulnerability
-- Problem: No server-side path for admin to update other users' roles securely.
--          The RLS policy "Users can update own profile (no role change)" blocks ALL role changes,
--          but admins need a controlled way to change roles on other users.
-- Solution:
--   1. RPC function admin_update_user_role() with strict validation
--   2. Admin UPDATE policy on profiles for non-role fields (full_name, phone, is_active)

-- =============================================
-- 1. RPC function for secure role changes
-- =============================================
CREATE OR REPLACE FUNCTION admin_update_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
BEGIN
  -- Must be authenticated
  IF caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Caller must be admin
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can change roles');
  END IF;

  -- Validate new_role value
  IF new_role NOT IN ('admin', 'operator') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role. Must be admin or operator');
  END IF;

  -- Prevent admin from demoting themselves
  IF target_user_id = caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot change your own role');
  END IF;

  -- Check target user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = target_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Perform the update
  UPDATE profiles SET role = new_role WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Revoke direct execute from anon, grant only to authenticated
REVOKE ALL ON FUNCTION admin_update_user_role(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_update_user_role(UUID, TEXT) TO authenticated;

-- =============================================
-- 2. Admin can update OTHER users' profiles (non-role fields)
--    The existing policy only allows self-update with no role change.
--    This new policy lets admins update other users' full_name, phone, is_active
--    while still preventing direct role column changes via RLS.
-- =============================================
DROP POLICY IF EXISTS "Admins can update other profiles" ON profiles;
CREATE POLICY "Admins can update other profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (
    is_admin()
    AND role = (SELECT role FROM profiles p WHERE p.id = profiles.id)
  );
