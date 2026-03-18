-- Migration: Payment tracking + Credit notes (avoirs)

-- ============================================
-- 1. Payments table
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'virement'
    CHECK (payment_method IN ('virement', 'cheque', 'especes', 'cb', 'prelevement', 'autre')),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on payments"
  ON payments FOR ALL USING (is_admin());

-- ============================================
-- 2. Credit notes (avoirs) — extend invoice_type
-- ============================================
-- Drop and recreate CHECK to add 'avoir'
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_type_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_invoice_type_check
  CHECK (invoice_type IN ('standard', 'acompte', 'solde', 'avoir'));

-- Reference to original invoice for credit notes
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS credit_note_for_id UUID REFERENCES invoices(id);
