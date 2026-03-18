-- Migration: Add invoice types (standard, acompte, solde)
-- Allows deposit invoices (% of total) and balance invoices (remaining after deposits)

-- 1. Add invoice_type enum-like column with CHECK constraint
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_type TEXT NOT NULL DEFAULT 'standard'
    CHECK (invoice_type IN ('standard', 'acompte', 'solde'));

-- 2. Deposit percentage (only for acompte invoices)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS deposit_percentage NUMERIC(5,2)
    CHECK (deposit_percentage IS NULL OR (deposit_percentage > 0 AND deposit_percentage <= 100));

-- 3. Reference to the deposit invoice (for solde invoices)
-- Also usable for acompte invoices to chain multiple deposits
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS deposit_invoice_id UUID REFERENCES invoices(id);

-- 4. Payment terms
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_terms TEXT NOT NULL DEFAULT '30_days'
    CHECK (payment_terms IN ('on_receipt', '30_days', '30_days_eom', '60_days', '60_days_eom'));
