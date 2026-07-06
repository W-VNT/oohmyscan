-- ============================================================================
-- Security hardening (rapport lint Supabase, 2026-07-07)
--
-- 4 groupes de fixes :
--   1. RLS : retire les policies permissives "Authenticated access ..." qui
--      donnaient USING(true) WITH CHECK(true) sur locations, panel_contracts
--      et contract_amendments. Les policies "Admin full access ..." et
--      "Operator read/insert ..." de la migration 20260313_locations_contracts.sql
--      prennent le relais.
--   2. search_path fige sur toutes les fonctions plpgsql/sql (defense contre
--      le hijack via schema squatting).
--   3. REVOKE anon sur toutes les SECURITY DEFINER. Les fonctions qui checkent
--      is_admin() ou auth.uid() en interne sont deja safe, c'est defense-in-depth.
--      Les fonctions trigger sont REVOKE ALL FROM PUBLIC (jamais appelees en RPC).
--   4. Retire le listing SELECT sur le bucket company-assets. Le bucket reste
--      public.true, donc getPublicUrl continue de fonctionner. On ne touche pas
--      panel-photos : .download() et createSignedUrl() en dependent.
--
-- Etape manuelle apres apply : Dashboard > Auth > Password Protection >
-- activer "Prevent use of compromised passwords" (HIBP).
-- ============================================================================

-- ============================================================================
-- 1. RLS : cleanup des policies permissives ajoutees via le Dashboard
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated access locations" ON locations;
DROP POLICY IF EXISTS "Authenticated access contracts" ON panel_contracts;
DROP POLICY IF EXISTS "Authenticated access amendments" ON contract_amendments;

-- ============================================================================
-- 2. Search_path fige sur toutes les fonctions user-defined
-- ============================================================================
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_next_amendment_number(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_location_has_contract() SET search_path = public, pg_temp;
ALTER FUNCTION public.save_quote_lines(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL) SET search_path = public, pg_temp;
ALTER FUNCTION public.save_invoice_lines(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL) SET search_path = public, pg_temp;
ALTER FUNCTION public.audit_log_trigger() SET search_path = public, pg_temp;
ALTER FUNCTION public.auto_vacate_panels_on_campaign_end() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_next_potential_number() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_next_quote_number() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_next_invoice_number() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_campaign_reports_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_next_contract_number() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_orphan_locations(INT) SET search_path = public, pg_temp;

-- ============================================================================
-- 3. REVOKE anon sur toutes les SECURITY DEFINER exposees
--    - fonctions RPC callables par un operateur/admin : REVOKE anon uniquement
--    - fonctions trigger : REVOKE ALL FROM PUBLIC (jamais RPC)
-- ============================================================================

-- 3a. Fonctions RPC : keep authenticated, revoke anon
REVOKE EXECUTE ON FUNCTION public.admin_update_user_role(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_orphan_locations(INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_next_invoice_number() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_next_potential_number() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_next_quote_number() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_next_contract_number() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_next_amendment_number(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.save_invoice_lines(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL) FROM anon;
REVOKE EXECUTE ON FUNCTION public.save_quote_lines(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL) FROM anon;

-- 3b. Fonctions trigger : REVOKE ALL (jamais appelees en RPC)
REVOKE ALL ON FUNCTION public.audit_log_trigger() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_log_trigger() FROM anon;
REVOKE ALL ON FUNCTION public.audit_log_trigger() FROM authenticated;

REVOKE ALL ON FUNCTION public.notify_admins_panel_report() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_admins_panel_report() FROM anon;
REVOKE ALL ON FUNCTION public.notify_admins_panel_report() FROM authenticated;

REVOKE ALL ON FUNCTION public.sync_location_has_contract() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_location_has_contract() FROM anon;
REVOKE ALL ON FUNCTION public.sync_location_has_contract() FROM authenticated;

REVOKE ALL ON FUNCTION public.set_campaign_reports_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_campaign_reports_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.set_campaign_reports_updated_at() FROM authenticated;

REVOKE ALL ON FUNCTION public.auto_vacate_panels_on_campaign_end() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_vacate_panels_on_campaign_end() FROM anon;
REVOKE ALL ON FUNCTION public.auto_vacate_panels_on_campaign_end() FROM authenticated;

-- ============================================================================
-- 4. Storage : retire le listing sur company-assets
--    Bucket reste public.true donc getPublicUrl fonctionne toujours.
--    panel-photos garde sa policy SELECT car .download() + createSignedUrl()
--    sont utilises par le code.
-- ============================================================================
DROP POLICY IF EXISTS "Public read company-assets" ON storage.objects;
