-- Migration: Fix constraints — cascade prevention, singleton, unique quote→invoice
-- Idempotent: safe to run multiple times

-- =============================================
-- 1. CLIENTS: Add is_active column for soft-delete
--    (The hook already expects it but the DB doesn't have it)
-- =============================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- =============================================
-- 2. CLIENT FK — Explicit ON DELETE RESTRICT
--    Replace default NO ACTION with explicit RESTRICT on all client FKs.
--    RESTRICT is identical to NO ACTION in PostgreSQL for immediate constraints
--    but documents the intent clearly.
-- =============================================

-- campaigns.client_id → RESTRICT
DO $$
BEGIN
  -- Drop old FK if it exists (could be named differently)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'campaigns'
      AND kcu.column_name = 'client_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Get and drop the constraint by name
    EXECUTE (
      SELECT 'ALTER TABLE campaigns DROP CONSTRAINT ' || quote_ident(tc.constraint_name)
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'campaigns'
        AND kcu.column_name = 'client_id'
        AND tc.constraint_type = 'FOREIGN KEY'
      LIMIT 1
    );
  END IF;

  ALTER TABLE campaigns
    ADD CONSTRAINT campaigns_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- quotes.client_id → RESTRICT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'quotes'
      AND kcu.column_name = 'client_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE quotes DROP CONSTRAINT ' || quote_ident(tc.constraint_name)
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'quotes'
        AND kcu.column_name = 'client_id'
        AND tc.constraint_type = 'FOREIGN KEY'
      LIMIT 1
    );
  END IF;

  ALTER TABLE quotes
    ADD CONSTRAINT quotes_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- invoices.client_id → RESTRICT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'invoices'
      AND kcu.column_name = 'client_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE invoices DROP CONSTRAINT ' || quote_ident(tc.constraint_name)
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'invoices'
        AND kcu.column_name = 'client_id'
        AND tc.constraint_type = 'FOREIGN KEY'
      LIMIT 1
    );
  END IF;

  ALTER TABLE invoices
    ADD CONSTRAINT invoices_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- 3. COMPANY_SETTINGS — Singleton constraint
--    Prevent more than 1 row via a CHECK + UNIQUE on a constant column.
--    We add a boolean column `singleton` that is always TRUE and UNIQUE.
-- =============================================
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS singleton BOOLEAN DEFAULT TRUE;

-- Set all existing rows (should be 1) to TRUE
UPDATE company_settings SET singleton = TRUE WHERE singleton IS NULL;

-- Add NOT NULL
ALTER TABLE company_settings ALTER COLUMN singleton SET NOT NULL;

-- Add CHECK constraint: value must be TRUE
DO $$
BEGIN
  ALTER TABLE company_settings ADD CONSTRAINT company_settings_singleton_check
    CHECK (singleton = TRUE);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add UNIQUE constraint: only one row can have singleton = TRUE
DO $$
BEGIN
  ALTER TABLE company_settings ADD CONSTRAINT company_settings_singleton_unique
    UNIQUE (singleton);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- 4. INVOICES — Unique quote_id (partial index)
--    Prevent creating multiple invoices from the same quote.
-- =============================================
CREATE UNIQUE INDEX IF NOT EXISTS invoices_quote_id_unique
  ON invoices (quote_id)
  WHERE quote_id IS NOT NULL;
