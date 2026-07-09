-- ============================================================================
-- Ajout campaigns.panel_format_id : format au niveau CAMPAGNE
--
-- Contexte : jusqu'ici le format de support etait porte uniquement par les
-- visuels (campaign_visuals.panel_format_id). Consequence : impossible de
-- creer une campagne sans upload de visuel car sinon on ne peut pas
-- determiner son workflow (qr / deposit / free_panel).
--
-- Fix : le format devient un champ obligatoire au niveau campagne. Les
-- visuels heritent par defaut de ce format (mais peuvent l'override).
-- L'auto-detection du workflow prend d'abord campaigns.panel_format_id,
-- puis fallback sur les visuels si non defini (rows existantes avant cette
-- migration).
-- ============================================================================

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS panel_format_id UUID REFERENCES panel_formats(id);

CREATE INDEX IF NOT EXISTS idx_campaigns_panel_format_id
  ON campaigns(panel_format_id) WHERE panel_format_id IS NOT NULL;

COMMENT ON COLUMN campaigns.panel_format_id IS
  'Format de support principal de la campagne (Sous-bock, Panneau libre, 4x3...). Determine le workflow operateur (qr / deposit / free_panel). Les visuels heritent de ce format par defaut mais peuvent l''override via campaign_visuals.panel_format_id.';

NOTIFY pgrst, 'reload schema';
