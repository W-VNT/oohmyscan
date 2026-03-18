-- Migration: Dunning (payment reminders) tracking

CREATE TABLE dunning_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  level INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 3),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  method TEXT DEFAULT 'email' CHECK (method IN ('email', 'manual')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id)
);

ALTER TABLE dunning_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on dunning_history"
  ON dunning_history FOR ALL USING (is_admin());

-- Dunning settings in company_settings
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS dunning_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS dunning_delay_1 INT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS dunning_delay_2 INT DEFAULT 15,
  ADD COLUMN IF NOT EXISTS dunning_delay_3 INT DEFAULT 30;
