-- ============================================================================
-- Security hardening V3 (defense-in-depth + kill anon warning residuel)
--
-- Sections :
--   1. Ajoute IF NOT is_admin() THEN RAISE dans les 3 fonctions de
--      numerotation admin-only (facture, devis, prospect). Ces fonctions
--      restent SECURITY DEFINER (bypass RLS pour lire/updater company_settings)
--      mais refusent maintenant tout appel non-admin. Le WARN 0029 du lint
--      reste (il ne regarde pas le corps), mais un operateur qui tenterait
--      d'appeler ces RPC via curl echouerait proprement.
--
--   2. REVOKE explicit depuis anon sur get_company_public. Le REVOKE FROM
--      PUBLIC de la v2 n'a pas suffi : Supabase auto-grante EXECUTE aux roles
--      anon/authenticated/service_role via ALTER DEFAULT PRIVILEGES lors du
--      CREATE FUNCTION, ce qui court-circuite le REVOKE FROM PUBLIC.
--      Explicit REVOKE FROM anon kill le warning 0028.
-- ============================================================================

-- ============================================================================
-- 1. Defense-in-depth : refuser les appels non-admin
--    Preservation SECURITY DEFINER + search_path fige (set en v1).
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_quote_number()
RETURNS TEXT AS $$
DECLARE
  settings company_settings%ROWTYPE;
  num TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;
  SELECT * INTO settings FROM company_settings LIMIT 1 FOR UPDATE;
  num := settings.quote_prefix || '-' ||
         LPAD(EXTRACT(YEAR FROM NOW())::TEXT % 100 || '', 2, '0') ||
         LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0') || '-' ||
         LPAD(settings.next_quote_number::TEXT, 4, '0');
  UPDATE company_settings SET next_quote_number = next_quote_number + 1;
  RETURN num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
  settings company_settings%ROWTYPE;
  num TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;
  SELECT * INTO settings FROM company_settings LIMIT 1 FOR UPDATE;
  num := settings.invoice_prefix || '-' ||
         LPAD(EXTRACT(YEAR FROM NOW())::TEXT % 100 || '', 2, '0') ||
         LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0') || '-' ||
         LPAD(settings.next_invoice_number::TEXT, 4, '0');
  UPDATE company_settings SET next_invoice_number = next_invoice_number + 1;
  RETURN num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION get_next_potential_number()
RETURNS TEXT AS $$
DECLARE
  settings company_settings%ROWTYPE;
  num TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;
  SELECT * INTO settings FROM company_settings LIMIT 1 FOR UPDATE;
  num := settings.potential_prefix || '-' ||
         EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
         LPAD(settings.next_potential_number::TEXT, 3, '0');
  UPDATE company_settings SET next_potential_number = next_potential_number + 1;
  RETURN num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Reapply grants (CREATE OR REPLACE preserve normalement mais paranoia)
REVOKE EXECUTE ON FUNCTION public.get_next_quote_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_next_invoice_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_next_potential_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_next_quote_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_potential_number() TO authenticated;

-- ============================================================================
-- 2. Kill du warning anon residuel sur get_company_public
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.get_company_public() FROM anon;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
