-- ============================================================
-- MIGRATION: Plan completion - client FK, auto-vacate, atomic numbering
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. CAMPAIGNS: Add client_id FK, target_panel_count, budget, notes
-- ============================================================

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id),
  ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS target_panel_count INT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Migrate existing text client → FK
INSERT INTO clients (company_name)
SELECT DISTINCT client FROM campaigns
WHERE client IS NOT NULL
  AND client != ''
  AND NOT EXISTS (
    SELECT 1 FROM clients c WHERE c.company_name = campaigns.client
  );

UPDATE campaigns c
SET client_id = cl.id
FROM clients cl
WHERE cl.company_name = c.client
  AND c.client_id IS NULL;

-- Keep the text `client` column for backward compat during migration
-- It can be dropped later once all code uses client_id

-- 2. TRIGGER: Auto-vacate panels when campaign completed
-- ============================================================

CREATE OR REPLACE FUNCTION auto_vacate_panels_on_campaign_end()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Unassign active panel_campaigns
    UPDATE panel_campaigns
    SET unassigned_at = NOW()
    WHERE campaign_id = NEW.id AND unassigned_at IS NULL;

    -- Set panels back to vacant
    UPDATE panels
    SET status = 'vacant',
        updated_at = NOW()
    WHERE id IN (
      SELECT panel_id FROM panel_campaigns
      WHERE campaign_id = NEW.id
    )
    AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_campaign_completed ON campaigns;
CREATE TRIGGER trigger_campaign_completed
  AFTER UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION auto_vacate_panels_on_campaign_end();

-- 3. ATOMIC NUMBERING: get_next_quote_number / get_next_invoice_number
-- ============================================================

CREATE OR REPLACE FUNCTION get_next_quote_number()
RETURNS TEXT AS $$
DECLARE
  settings company_settings%ROWTYPE;
  num TEXT;
BEGIN
  SELECT * INTO settings FROM company_settings LIMIT 1 FOR UPDATE;
  num := settings.quote_prefix || '-' ||
         EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
         LPAD(settings.next_quote_number::TEXT, 3, '0');
  UPDATE company_settings SET next_quote_number = next_quote_number + 1;
  RETURN num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
  settings company_settings%ROWTYPE;
  num TEXT;
BEGIN
  SELECT * INTO settings FROM company_settings LIMIT 1 FOR UPDATE;
  num := settings.invoice_prefix || '-' ||
         EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
         LPAD(settings.next_invoice_number::TEXT, 3, '0');
  UPDATE company_settings SET next_invoice_number = next_invoice_number + 1;
  RETURN num;
END;
$$ LANGUAGE plpgsql;

-- 4. ADD panel_format_id to campaign_visuals (if not exists)
-- ============================================================

ALTER TABLE campaign_visuals
  ADD COLUMN IF NOT EXISTS panel_format_id UUID REFERENCES panel_formats(id);

-- 5. ADD is_active to profiles (for user deactivation)
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
