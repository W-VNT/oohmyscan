-- Migration: Merge panel format + type into a single "panel type" concept
-- The panel_formats table stays as-is (campaign_visuals FK depends on it)
-- but we add missing types, a default_panel_type_id to company_settings,
-- and migrate panels.format + panels.type data into panels.type only.

-- 1. Add new seed values that existed only as hardcoded PANEL_TYPES
INSERT INTO panel_formats (name) VALUES
  ('Plexi'),
  ('Mural'),
  ('Déroulant'),
  ('A0'),
  ('A1'),
  ('A2'),
  ('A3')
ON CONFLICT (name) DO NOTHING;

-- 2. Add default_panel_type_id column to company_settings
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS default_panel_type_id UUID REFERENCES panel_formats(id);

-- 3. Migrate existing panel data: merge format+type into type field
-- If panel has a format but no type, copy format to type
UPDATE panels SET type = format WHERE type IS NULL AND format IS NOT NULL;
-- If panel has both, concatenate (e.g. "4x3 / Mural")
UPDATE panels SET type = format || ' / ' || type WHERE type IS NOT NULL AND format IS NOT NULL AND format != type AND format != '';
-- Leave panels where format == type as-is (already correct)

-- 4. We keep the format column for now (backward compat with campaign visual matching)
-- but new panels will only use type going forward
