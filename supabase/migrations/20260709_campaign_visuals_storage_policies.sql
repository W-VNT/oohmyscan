-- ============================================================================
-- Storage policies pour le bucket campaign-visuals
--
-- Contexte : le bucket campaign-visuals a ete cree en mars 2026 mais aucune
-- policy sur storage.objects n'etait definie via migration. Les uploads
-- passaient probablement via des policies auto-generees dans le Dashboard
-- qui ont ete perdues ou jamais faites. Symptome : "new row violates RLS
-- policy" sur upload d'un visuel de campagne (bloque toute creation de
-- campagne avec image).
--
-- Policies :
--   - Admin : full access (INSERT/UPDATE/DELETE/SELECT sur le bucket)
--   - Authenticated : SELECT (les operateurs voient les visuels des
--     campagnes actives)
-- ============================================================================

-- Admin : full access
DROP POLICY IF EXISTS "Admin manage campaign-visuals" ON storage.objects;
CREATE POLICY "Admin manage campaign-visuals" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'campaign-visuals' AND is_admin())
  WITH CHECK (bucket_id = 'campaign-visuals' AND is_admin());

-- Authenticated : lecture (operateurs affichent les visuels dans le wizard)
DROP POLICY IF EXISTS "Authenticated read campaign-visuals" ON storage.objects;
CREATE POLICY "Authenticated read campaign-visuals" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'campaign-visuals');
