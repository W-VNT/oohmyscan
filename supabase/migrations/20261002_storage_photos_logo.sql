-- ============================================================================
-- Stockage : photos terrain et logo de l'entreprise
--
-- 1. "Authenticated can delete photos" : n'importe quel connecte pouvait
--    supprimer n'importe quelle photo terrain. -> ses propres fichiers
--    (owner = uploader) ou admin. Contrats/signatures restent proteges par
--    "Contracts immutable once stored (delete)".
-- 2. Table panel_photos : aucune policy de suppression pour l'operateur
--    (le fichier etait supprime mais la ligne restait). -> l'operateur
--    supprime ses propres photos (taken_by), l'admin garde son acces complet.
-- 3. company-assets (logo imprime sur devis/factures/contrats) : les
--    policies "Admin upload/update" ne verifiaient PAS le role admin ->
--    n'importe quel operateur pouvait remplacer le logo. -> admin uniquement.
-- IDEMPOTENT.
-- ============================================================================

-- 1. Suppression des fichiers photos
DROP POLICY IF EXISTS "Authenticated can delete photos" ON storage.objects;
DROP POLICY IF EXISTS "Delete own photos or admin" ON storage.objects;
CREATE POLICY "Delete own photos or admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'panel-photos'
    AND (public.is_admin() OR owner_id = auth.uid()::text OR owner = auth.uid())
  );

-- 2. Suppression des lignes panel_photos
DROP POLICY IF EXISTS "Operators delete own photos" ON public.panel_photos;
CREATE POLICY "Operators delete own photos" ON public.panel_photos
  FOR DELETE TO authenticated
  USING (taken_by = auth.uid());

-- 3. Logo / assets entreprise : admin uniquement
DROP POLICY IF EXISTS "Admin upload company-assets" ON storage.objects;
CREATE POLICY "Admin upload company-assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admin update company-assets" ON storage.objects;
CREATE POLICY "Admin update company-assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'company-assets' AND public.is_admin())
  WITH CHECK (bucket_id = 'company-assets' AND public.is_admin());

-- Verification
SELECT policyname, cmd FROM pg_policies
WHERE (schemaname = 'storage' AND tablename = 'objects'
       AND policyname IN ('Delete own photos or admin', 'Admin upload company-assets', 'Admin update company-assets'))
   OR (schemaname = 'public' AND tablename = 'panel_photos' AND policyname = 'Operators delete own photos')
ORDER BY policyname;
