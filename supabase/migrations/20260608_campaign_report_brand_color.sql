-- Migration: Couleur de marque personnalisable par rapport.
-- Default vit dans company_settings, override par rapport dans campaign_reports.

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS default_brand_color TEXT;

ALTER TABLE campaign_reports
  ADD COLUMN IF NOT EXISTS brand_color TEXT;

COMMENT ON COLUMN campaign_reports.brand_color IS
  'Couleur principale du rapport (hex avec #). Override le default_brand_color de company_settings.';
