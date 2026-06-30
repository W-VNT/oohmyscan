-- ============================================================================
-- Supports sans QR code (sous-bocks, sets de table, flyers...)
-- ============================================================================
-- Permet de gerer des campagnes ou les supports physiques n'ont pas de QR
-- code individuel. Au lieu d'installer un panneau par scan, l'operateur
-- depose une quantite de supports dans un lieu (bar, resto...) et prend
-- une photo de validation.
--
-- Pre-requis : migration 20260629_campaign_operators.sql (operator_user_ids)
-- ============================================================================

-- 1. panel_formats : flag has_qr_code
ALTER TABLE panel_formats
  ADD COLUMN IF NOT EXISTS has_qr_code BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN panel_formats.has_qr_code IS
  'true = panneau physique avec QR individuel (workflow install/scan). false = support en masse depose sur lieu (sous-bock, set de table, flyer) avec workflow depot + photo + quantite';

-- 2. Seed des formats sans QR
INSERT INTO panel_formats (name, has_qr_code, is_active)
VALUES
  ('Sous-bock', false, true),
  ('Set de table', false, true)
ON CONFLICT (name) DO UPDATE SET has_qr_code = EXCLUDED.has_qr_code;

-- 3. Table campaign_deposits : chaque depot terrain
CREATE TABLE IF NOT EXISTS campaign_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  photo_path TEXT NOT NULL,
  -- Snapshot du lieu (Google Places). place_id peut etre NULL si saisie manuelle.
  place_id TEXT,
  place_name TEXT NOT NULL,
  place_address TEXT,
  lat NUMERIC(10, 7),
  lng NUMERIC(10, 7),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_deposits_campaign_id
  ON campaign_deposits(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_deposits_operator_id
  ON campaign_deposits(operator_id);
CREATE INDEX IF NOT EXISTS idx_campaign_deposits_created_at
  ON campaign_deposits(created_at DESC);

COMMENT ON TABLE campaign_deposits IS
  'Depots de supports en masse (sous-bocks, sets de table) lors d''une campagne. Chaque ligne = un passage operateur dans un lieu, avec photo + quantite.';

-- 4. RLS
ALTER TABLE campaign_deposits ENABLE ROW LEVEL SECURITY;

-- Admin : full access
CREATE POLICY "Admin full access campaign_deposits"
  ON campaign_deposits FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Operateurs : peuvent lire les depots des campagnes auxquelles ils ont acces
CREATE POLICY "Operators read campaign_deposits"
  ON campaign_deposits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_deposits.campaign_id
        AND (
          auth.uid() = ANY(c.operator_user_ids)
          OR c.operator_user_ids = '{}'  -- campagne ouverte a tous
        )
    )
  );

-- Operateurs : peuvent inserer leurs propres depots sur les campagnes auxquelles ils ont acces
CREATE POLICY "Operators insert own deposits"
  ON campaign_deposits FOR INSERT
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
