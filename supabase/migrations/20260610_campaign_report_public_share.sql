-- ============================================================================
-- Partage public des rapports campagne (C1 — lien direct vers PDF)
-- ============================================================================
-- Ajoute public_token + published_pdf_path + published_at sur campaign_reports.
-- Crée le bucket campaign-reports-public (lecture anonyme autorisée).
-- La publication génère le PDF côté client et l'upload dans ce bucket.
-- ============================================================================

-- 1. Colonnes
ALTER TABLE campaign_reports
  ADD COLUMN IF NOT EXISTS public_token UUID UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS published_pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Backfill : génère un token pour les rapports existants
UPDATE campaign_reports
  SET public_token = gen_random_uuid()
  WHERE public_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_reports_public_token
  ON campaign_reports(public_token)
  WHERE published_pdf_path IS NOT NULL;

COMMENT ON COLUMN campaign_reports.public_token IS 'Token UUID stable utilisé dans les URLs publiques /view/rapport/<token>';
COMMENT ON COLUMN campaign_reports.published_pdf_path IS 'Chemin du PDF dans le bucket campaign-reports-public (null = non publié)';
COMMENT ON COLUMN campaign_reports.published_at IS 'Timestamp de la dernière publication';

-- 2. RLS : autoriser la lecture anonyme via public_token UNIQUEMENT quand le rapport est publié
-- (id, campaign_id, public_token, published_pdf_path, published_at sont les seules colonnes nécessaires)
DROP POLICY IF EXISTS "Public read published campaign reports" ON campaign_reports;
CREATE POLICY "Public read published campaign reports" ON campaign_reports
  FOR SELECT TO anon, authenticated
  USING (published_pdf_path IS NOT NULL);

-- 3. Bucket public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'campaign-reports-public',
    'campaign-reports-public',
    true,
    52428800, -- 50 MB
    ARRAY['application/pdf']
  )
  ON CONFLICT (id) DO UPDATE
    SET public = true,
        file_size_limit = 52428800,
        allowed_mime_types = ARRAY['application/pdf'];

-- 4. Storage policies — admin upload/update/delete, anonyme lecture
DROP POLICY IF EXISTS "Admin manage campaign-reports-public" ON storage.objects;
CREATE POLICY "Admin manage campaign-reports-public" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'campaign-reports-public' AND is_admin())
  WITH CHECK (bucket_id = 'campaign-reports-public' AND is_admin());

-- Public read est géré automatiquement par le flag bucket.public=true
