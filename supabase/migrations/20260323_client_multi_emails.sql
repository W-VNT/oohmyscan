-- Migration: Add billing and commercial emails to clients

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS commercial_email TEXT;

-- Migrate existing contact_email to commercial_email
UPDATE clients SET commercial_email = contact_email WHERE contact_email IS NOT NULL AND commercial_email IS NULL;

NOTIFY pgrst, 'reload schema';
