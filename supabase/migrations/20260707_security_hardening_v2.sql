-- ============================================================================
-- Security hardening V2 (suite du rapport lint post-migration V1)
--
-- Constat apres apply de 20260707_security_hardening.sql :
--   - 13 warnings search_path FIXES
--   - 3 warnings RLS permissive FIXES
--   - 1 warning storage listing (company-assets) FIX
--   - 6 warnings anon_security_definer PERSISTENT sur : get_next_quote_number,
--     get_next_invoice_number, get_next_potential_number, is_admin,
--     save_quote_lines, save_invoice_lines
--
-- Cause du persistant : ces 6 fonctions n'avaient jamais de GRANT explicite,
-- elles heritaient EXECUTE de PUBLIC (default PostgreSQL). Un REVOKE FROM anon
-- ne peut pas supprimer un droit herite de PUBLIC. Il faut REVOKE FROM PUBLIC
-- puis regrant explicite a authenticated.
--
-- Section 2 : conversion de la vue company_public en fonction SECURITY DEFINER.
--   Une vue SECURITY DEFINER est flag ERROR par le lint (0010_security_definer_view).
--   Une fonction est le pattern recommande, meme resultat (bypass RLS sur
--   company_settings, expose champs whitelist aux operateurs).
-- ============================================================================

-- ============================================================================
-- 1. REVOKE FROM PUBLIC + regrant explicite pour les 6 fonctions restantes
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.get_next_quote_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_next_quote_number() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_next_invoice_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_next_potential_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_next_potential_number() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.save_quote_lines(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_quote_lines(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.save_invoice_lines(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_invoice_lines(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL) TO authenticated;

-- ============================================================================
-- 2. Vue company_public -> fonction SECURITY DEFINER
--
-- La vue etait volontairement SECURITY DEFINER (via security_invoker=false) pour
-- donner aux operateurs un acces read-only aux champs non-sensibles de
-- company_settings (qui est admin-only en RLS). Le lint flag les
-- SECURITY DEFINER VIEW en ERROR car elles sont subtiles a auditer. Une
-- fonction SECURITY DEFINER est le pattern recommande.
--
-- IDEMPOTENT : DROP VIEW IF EXISTS + CREATE OR REPLACE FUNCTION. Safe meme si
-- la vue a deja ete supprimee (par ex via Dashboard).
-- ============================================================================

DROP VIEW IF EXISTS public.company_public;

CREATE OR REPLACE FUNCTION public.get_company_public()
RETURNS TABLE (
  id UUID,
  company_name TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  siret TEXT,
  tva_number TEXT,
  phone TEXT,
  email TEXT,
  logo_path TEXT,
  legal_mentions TEXT,
  late_penalty_text TEXT,
  default_panel_type_id UUID,
  email_contract_subject TEXT,
  email_contract_body TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    cs.id,
    cs.company_name,
    cs.address,
    cs.city,
    cs.postal_code,
    cs.siret,
    cs.tva_number,
    cs.phone,
    cs.email,
    cs.logo_path,
    cs.legal_mentions,
    cs.late_penalty_text,
    cs.default_panel_type_id,
    cs.email_contract_subject,
    cs.email_contract_body
  FROM company_settings cs
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_company_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_public() TO authenticated;

COMMENT ON FUNCTION public.get_company_public() IS
  'Lecture des parametres entreprise "publics" (sans IBAN/BIC/cles API). '
  'Remplace la vue company_public (retiree pour cause de warning lint '
  'security_definer_view). Meme comportement : SECURITY DEFINER pour '
  'bypasser RLS admin-only de company_settings, expose uniquement les '
  'champs whitelist necessaires aux operateurs pour les PDF contrats.';

-- Reload PostgREST schema cache pour exposer la nouvelle fonction en RPC
NOTIFY pgrst, 'reload schema';
