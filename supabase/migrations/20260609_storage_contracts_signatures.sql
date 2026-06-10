-- Migration: autorise les uploads contrats + signatures dans panel-photos
--
-- Le wizard install operateur (et l'ancien ContractStepper) uploadent :
--   - panel-photos/contracts/<doc-number>.pdf
--   - panel-photos/signatures/owner-<uuid>.png
--   - panel-photos/signatures/operator-<uuid>.png
--
-- La policy existante sur panel-photos limitait les writes a "path must start
-- with user's panels" (configuree dans Supabase Studio), donc contracts/ et
-- signatures/ tombaient en RLS violation.
--
-- On ajoute explicitement les autorisations pour ces 2 subpaths, accessible
-- a tout utilisateur authentifie (l'operateur installe sur le terrain, l'admin
-- peut aussi le faire depuis le back-office).

-- INSERT
DROP POLICY IF EXISTS "Auth can upload contracts and signatures" ON storage.objects;
CREATE POLICY "Auth can upload contracts and signatures" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'panel-photos'
    AND (
      (storage.foldername(name))[1] = 'contracts'
      OR (storage.foldername(name))[1] = 'signatures'
    )
  );

-- UPDATE (necessaire pour upsert: true sur contracts)
DROP POLICY IF EXISTS "Auth can update contracts and signatures" ON storage.objects;
CREATE POLICY "Auth can update contracts and signatures" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'panel-photos'
    AND (
      (storage.foldername(name))[1] = 'contracts'
      OR (storage.foldername(name))[1] = 'signatures'
    )
  )
  WITH CHECK (
    bucket_id = 'panel-photos'
    AND (
      (storage.foldername(name))[1] = 'contracts'
      OR (storage.foldername(name))[1] = 'signatures'
    )
  );

NOTIFY pgrst, 'reload schema';
