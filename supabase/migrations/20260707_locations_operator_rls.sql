-- ============================================================================
-- Fix RLS locations : reautorise l'operateur a INSERT/DELETE ses propres lieux
--
-- Contexte : la migration 20260707_security_hardening.sql a supprime la policy
-- permissive "Authenticated access locations" USING(true) WITH CHECK(true).
-- Il ne restait que "Admin full access locations" et "Operator read locations".
-- L'opeateur ne pouvait plus creer un lieu depuis le wizard install
-- (InstallWizardPage.tsx:822) ni cleanup un orphelin (guardedBack /
-- ScanPage.handleBack).
--
-- Fix :
--   - INSERT : any authenticated, mais force created_by = auth.uid(). L'admin
--     conserve son "Admin full access" en plus.
--   - DELETE : scoped a "sa propre creation ET sans contract ET sans panels".
--     Meme contrat que cleanup_orphan_locations, cleanup purement defensif.
-- ============================================================================

DROP POLICY IF EXISTS "Operator insert locations" ON locations;
CREATE POLICY "Operator insert locations" ON locations
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Operator delete own no-contract locations" ON locations;
CREATE POLICY "Operator delete own no-contract locations" ON locations
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    AND has_contract = FALSE
    AND NOT EXISTS (SELECT 1 FROM panels WHERE location_id = locations.id)
    AND NOT EXISTS (SELECT 1 FROM panel_contracts WHERE location_id = locations.id)
  );
