-- Phase 7: Potential Requests feature
-- Table to store commercial potential analysis requests

CREATE TABLE potential_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL,
  prospect_name TEXT NOT NULL,
  city TEXT NOT NULL,
  radius_km INT NOT NULL DEFAULT 10,
  support_type TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  existing_panels_count INT DEFAULT 0,
  potential_spots_count INT DEFAULT 0,
  existing_panel_ids UUID[] DEFAULT '{}',
  potential_spots JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE potential_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on potential_requests"
  ON potential_requests FOR ALL USING (is_admin());

-- Add numbering columns to company_settings
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS potential_prefix TEXT DEFAULT 'POT',
  ADD COLUMN IF NOT EXISTS next_potential_number INT DEFAULT 1;

-- Atomic numbering function
CREATE OR REPLACE FUNCTION get_next_potential_number()
RETURNS TEXT AS $$
DECLARE
  settings company_settings%ROWTYPE;
  num TEXT;
BEGIN
  SELECT * INTO settings FROM company_settings LIMIT 1 FOR UPDATE;
  num := settings.potential_prefix || '-' ||
         EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
         LPAD(settings.next_potential_number::TEXT, 3, '0');
  UPDATE company_settings SET next_potential_number = next_potential_number + 1;
  RETURN num;
END;
$$ LANGUAGE plpgsql;
