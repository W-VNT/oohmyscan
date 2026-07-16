-- ============================================================================
-- Fix bugs get_next_quote_number / get_next_invoice_number
--
-- Bug 1 : modulo sur TEXT (introduit 20260317, reproduit 20260707_v3) :
--   LPAD(EXTRACT(YEAR FROM NOW())::TEXT % 100 || '', 2, '0')
--                            ^^^^^^^^^^^^ modulo sur TEXT -> erreur
--                            "operator does not exist: text % integer"
--   Fix : caster en INTEGER AVANT le modulo, puis en TEXT ensuite.
--
-- Bug 2 : UPDATE company_settings sans WHERE -> Supabase safe-update mode
--   rejette avec "UPDATE requires a WHERE clause".
--   Fix : WHERE id = settings.id (singleton, on connait deja son id).
--
-- Format conserve : PREFIX-YYMM-NNNN (ex: D-2607-0001, F-2607-0001).
-- Preserve : SECURITY DEFINER, is_admin() check, search_path fige.
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
         LPAD((EXTRACT(YEAR FROM NOW())::INTEGER % 100)::TEXT, 2, '0') ||
         LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0') || '-' ||
         LPAD(settings.next_quote_number::TEXT, 4, '0');
  UPDATE company_settings SET next_quote_number = next_quote_number + 1
  WHERE id = settings.id;
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
         LPAD((EXTRACT(YEAR FROM NOW())::INTEGER % 100)::TEXT, 2, '0') ||
         LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0') || '-' ||
         LPAD(settings.next_invoice_number::TEXT, 4, '0');
  UPDATE company_settings SET next_invoice_number = next_invoice_number + 1
  WHERE id = settings.id;
  RETURN num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Reapply grants (defense-in-depth)
REVOKE EXECUTE ON FUNCTION public.get_next_quote_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_next_invoice_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_next_quote_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number() TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
