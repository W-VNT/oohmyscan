-- ============================================================================
-- Nouveau workflow : Panneau libre (sans QR, photo unitaire, lie a un lieu)
--
-- Contexte : jusqu'ici les formats de support avaient un flag has_qr_code
-- boolean qui distinguait 2 workflows :
--   - has_qr_code=true  -> install QR + contrat (workflow "qr")
--   - has_qr_code=false -> depot en masse (sous-bock, set de table) avec
--     quantite (workflow "deposit")
--
-- On ajoute un 3e workflow "free_panel" : panneau physique sans QR pose sur
-- un lieu specifique (poster mural, oriflamme...). L'operateur prend UNE
-- photo par pose, sans quantite. Chaque pose est liee au lieu (locations
-- via location_id, PAS Google Places direct).
--
-- Cette table est distincte de campaign_deposits pour separer les 2
-- concepts semantiquement (masse vs unitaire).
-- ============================================================================

-- 1. Enum workflow_type sur panel_formats
ALTER TABLE panel_formats
  ADD COLUMN IF NOT EXISTS workflow_type TEXT NOT NULL DEFAULT 'qr'
  CHECK (workflow_type IN ('qr', 'deposit', 'free_panel'));

COMMENT ON COLUMN panel_formats.workflow_type IS
  'Workflow operator side : qr = install + scan + contrat, deposit = depot en masse (sous-bock) avec quantite, free_panel = pose unitaire liee a un lieu (photo par photo)';

-- Backfill : les formats existants avec has_qr_code=false sont des deposits
UPDATE panel_formats
  SET workflow_type = 'deposit'
  WHERE has_qr_code = FALSE AND workflow_type = 'qr';

-- 2. Seed nouveau format "Panneau libre"
INSERT INTO panel_formats (name, has_qr_code, workflow_type, is_active)
VALUES ('Panneau libre', false, 'free_panel', true)
ON CONFLICT (name) DO UPDATE
  SET has_qr_code = EXCLUDED.has_qr_code,
      workflow_type = EXCLUDED.workflow_type,
      is_active = EXCLUDED.is_active;

-- 3. Nouvelle table campaign_free_panels
CREATE TABLE IF NOT EXISTS campaign_free_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  photo_path TEXT NOT NULL,
  lat NUMERIC(10, 7),
  lng NUMERIC(10, 7),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_free_panels_campaign_id
  ON campaign_free_panels(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_free_panels_operator_id
  ON campaign_free_panels(operator_id);
CREATE INDEX IF NOT EXISTS idx_campaign_free_panels_location_id
  ON campaign_free_panels(location_id);
CREATE INDEX IF NOT EXISTS idx_campaign_free_panels_created_at
  ON campaign_free_panels(created_at DESC);

COMMENT ON TABLE campaign_free_panels IS
  'Poses unitaires de panneaux libres (sans QR) sur un lieu specifique lors d''une campagne. 1 row = 1 photo prise lors d''une pose.';

-- 4. RLS
ALTER TABLE campaign_free_panels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access campaign_free_panels" ON campaign_free_panels;
CREATE POLICY "Admin full access campaign_free_panels"
  ON campaign_free_panels FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Operators read campaign_free_panels" ON campaign_free_panels;
CREATE POLICY "Operators read campaign_free_panels"
  ON campaign_free_panels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_free_panels.campaign_id
        AND (
          auth.uid() = ANY(c.operator_user_ids)
          OR c.operator_user_ids = '{}'
        )
    )
  );

DROP POLICY IF EXISTS "Operators insert own free_panels" ON campaign_free_panels;
CREATE POLICY "Operators insert own free_panels"
  ON campaign_free_panels FOR INSERT
  TO authenticated
  WITH CHECK (
    operator_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_id
        AND (
          auth.uid() = ANY(c.operator_user_ids)
          OR c.operator_user_ids = '{}'
        )
    )
  );

NOTIFY pgrst, 'reload schema';
