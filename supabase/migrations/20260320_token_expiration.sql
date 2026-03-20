-- Migration: Add expiration to public tokens

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS public_token_expires_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS public_token_expires_at TIMESTAMPTZ;

-- Set default expiration: 90 days from now for existing tokens
UPDATE quotes SET public_token_expires_at = NOW() + INTERVAL '90 days' WHERE public_token IS NOT NULL AND public_token_expires_at IS NULL;
UPDATE invoices SET public_token_expires_at = NOW() + INTERVAL '90 days' WHERE public_token IS NOT NULL AND public_token_expires_at IS NULL;
