-- Migration: Quote templates for reusable line sets

CREATE TABLE quote_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lines JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on quote_templates"
  ON quote_templates FOR ALL USING (is_admin());
