-- Migration: Recurring invoices

CREATE TABLE recurring_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  campaign_id UUID REFERENCES campaigns(id),
  frequency TEXT NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  next_issue_date DATE NOT NULL,
  template_lines JSONB NOT NULL DEFAULT '[]',
  payment_terms TEXT DEFAULT '30_days',
  notes TEXT,
  currency TEXT DEFAULT 'EUR',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on recurring_invoices"
  ON recurring_invoices FOR ALL USING (is_admin());
