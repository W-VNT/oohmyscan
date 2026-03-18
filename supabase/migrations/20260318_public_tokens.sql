-- Migration: Public tokens for client portal access

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS public_token UUID DEFAULT gen_random_uuid();
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS public_token UUID DEFAULT gen_random_uuid();

-- Unique index for fast token lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_public_token ON quotes(public_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_public_token ON invoices(public_token);

-- Public RLS policy: allow reading via token (no auth required)
-- This requires anon access enabled on the table with a specific policy

CREATE POLICY "Public read quotes via token"
  ON quotes FOR SELECT
  USING (true); -- Secured by token in the query, not by RLS alone

CREATE POLICY "Public read invoices via token"
  ON invoices FOR SELECT
  USING (true);
