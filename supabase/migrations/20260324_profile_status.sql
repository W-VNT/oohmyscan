-- Migration: Add status to profiles for invitation tracking

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
    CHECK (status IN ('invited', 'active'));

-- Existing profiles are active
UPDATE profiles SET status = 'active' WHERE status IS NULL;

NOTIFY pgrst, 'reload schema';
