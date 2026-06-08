-- Migration: Rapports de campagne (Proof of Posting v2 — template-driven)
-- Permet de générer un rapport pré-rempli à partir d'une campagne, puis de l'éditer
-- librement. Persisté en DB (un rapport par campagne).

-- =============================================
-- 1. Texte d'intro par défaut sur company_settings
--    Pré-rempli dans tous les nouveaux rapports, modifiable par campagne (override)
-- =============================================
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS default_report_intro_text TEXT,
  ADD COLUMN IF NOT EXISTS report_linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS report_website_url TEXT;

COMMENT ON COLUMN company_settings.default_report_intro_text IS
  'Paragraphe par defaut affiche en page "Le support publicitaire" du rapport campagne. Editable par rapport.';

-- =============================================
-- 2. Table campaign_reports
--    Un rapport par campagne (UNIQUE campaign_id).
--    slides JSONB contient l'array Slide[] qui pilote le rendu PDF + l'editeur.
-- =============================================
CREATE TABLE IF NOT EXISTS campaign_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  intro_text TEXT,                     -- override du default_report_intro_text
  cover_photo_path TEXT,               -- storage path de la photo de cover choisie
  contact_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- override contact campagne
  contact_name_override TEXT,          -- si l'admin veut afficher un autre nom
  contact_email_override TEXT,
  contact_phone_override TEXT,
  template_version INT NOT NULL DEFAULT 1,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaign_reports_unique_campaign UNIQUE (campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_reports_campaign ON campaign_reports(campaign_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_campaign_reports_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campaign_reports_updated_at ON campaign_reports;
CREATE TRIGGER trg_campaign_reports_updated_at
  BEFORE UPDATE ON campaign_reports
  FOR EACH ROW EXECUTE FUNCTION set_campaign_reports_updated_at();

-- =============================================
-- 3. RLS — admin only
-- =============================================
ALTER TABLE campaign_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access campaign_reports" ON campaign_reports;
CREATE POLICY "Admin full access campaign_reports" ON campaign_reports
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
