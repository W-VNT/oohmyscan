-- Migration: Fix admin back-office schema mismatches
-- 1. Rename invoices.due_date → due_at
-- 2. Add total_tva to quotes
-- 3. Add total_tva to invoices
-- 4. Fix quotes status CHECK: 'converted' → 'cancelled'

-- =============================================
-- 1. INVOICES: due_date → due_at
-- =============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE invoices RENAME COLUMN due_date TO due_at;
  END IF;
END $$;

-- =============================================
-- 2. QUOTES: add total_tva
-- =============================================
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS total_tva DECIMAL(10,2) DEFAULT 0;

-- =============================================
-- 3. INVOICES: add total_tva
-- =============================================
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_tva DECIMAL(10,2) DEFAULT 0;

-- =============================================
-- 4. QUOTES: fix status CHECK constraint
--    'converted' → 'cancelled'
-- =============================================
DO $$
BEGIN
  ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
  ALTER TABLE quotes ADD CONSTRAINT quotes_status_check
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'cancelled'));
END $$;
