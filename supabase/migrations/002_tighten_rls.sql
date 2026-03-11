-- Migration: Tighten RLS policies
-- Fixes: operators could modify any panel, update their own role, etc.

-- =============================================
-- 1. PROFILES — prevent role self-escalation
-- =============================================
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile (no role change)" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- Add avatar_url column if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- =============================================
-- 2. PANELS — operators can only insert + update their own
-- =============================================
DROP POLICY IF EXISTS "Operators can update panels on scan" ON panels;

-- Operators can create new panels
CREATE POLICY "Operators can insert panels" ON panels
  FOR INSERT TO authenticated
  WITH CHECK (installed_by = auth.uid());

-- Operators can update only panels they installed
CREATE POLICY "Operators can update own panels" ON panels
  FOR UPDATE TO authenticated
  USING (installed_by = auth.uid())
  WITH CHECK (installed_by = auth.uid());

-- =============================================
-- 3. PANEL_PHOTOS — operators can only insert their own
-- =============================================
DROP POLICY IF EXISTS "Operators can insert photos" ON panel_photos;
CREATE POLICY "Operators can insert own photos" ON panel_photos
  FOR INSERT TO authenticated
  WITH CHECK (taken_by = auth.uid());

-- =============================================
-- 4. PANEL_CAMPAIGNS — operators can only assign their own
-- =============================================
DROP POLICY IF EXISTS "Operators can assign campaigns" ON panel_campaigns;
CREATE POLICY "Operators can insert own assignments" ON panel_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (assigned_by = auth.uid());

-- Operators can update their own assignments (e.g., add validation photo)
CREATE POLICY "Operators can update own assignments" ON panel_campaigns
  FOR UPDATE TO authenticated
  USING (assigned_by = auth.uid())
  WITH CHECK (assigned_by = auth.uid());

-- =============================================
-- 5. Add contact_phone column to panels
-- =============================================
ALTER TABLE panels ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- =============================================
-- 6. Storage policies (run in Supabase dashboard)
-- =============================================
-- Create 'avatars' bucket (private) if not exists
-- Policies for panel-photos bucket:
--   SELECT: authenticated can read all
--   INSERT: authenticated, path must start with user's panels
-- Policies for avatars bucket:
--   SELECT: authenticated can read all
--   INSERT: authenticated, path starts with auth.uid()
--   UPDATE: authenticated, path starts with auth.uid()
