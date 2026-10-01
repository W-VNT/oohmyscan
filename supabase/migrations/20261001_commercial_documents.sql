-- ============================================================================
-- Lot 2 — Espace commercial : acces aux infos societe pour les PDF devis
--
-- company_settings est admin-only (contient resend_api_key, modeles email,
-- compteurs...). Le commercial a besoin des champs imprimes sur le devis :
-- coordonnees, logo, mentions, IBAN/BIC (deja sur chaque PDF envoye aux
-- clients), CGV. Fonction SECURITY DEFINER qui ne renvoie QUE ces champs.
--
-- + lecture du bucket company-pdfs (CGV fusionnees au PDF du devis).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_company_document_settings()
RETURNS TABLE (
  id UUID,
  company_name TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  siret TEXT,
  tva_number TEXT,
  logo_path TEXT,
  email TEXT,
  phone TEXT,
  iban TEXT,
  bic TEXT,
  quote_prefix TEXT,
  legal_mentions TEXT,
  late_penalty_text TEXT,
  terms_and_conditions TEXT,
  terms_and_conditions_pdf_path TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_commercial()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  RETURN QUERY
  SELECT cs.id, cs.company_name, cs.address, cs.city, cs.postal_code, cs.siret,
         cs.tva_number, cs.logo_path, cs.email, cs.phone, cs.iban, cs.bic,
         cs.quote_prefix, cs.legal_mentions, cs.late_penalty_text,
         cs.terms_and_conditions, cs.terms_and_conditions_pdf_path
  FROM company_settings cs
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_company_document_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_company_document_settings() TO authenticated;

DROP POLICY IF EXISTS "Commercial reads company PDFs" ON storage.objects;
CREATE POLICY "Commercial reads company PDFs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'company-pdfs' AND public.is_commercial());

NOTIFY pgrst, 'reload schema';
