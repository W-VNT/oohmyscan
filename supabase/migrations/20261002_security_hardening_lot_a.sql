-- ============================================================================
-- Audit securite — Lot A (base de donnees)
--
--  1. Rapports de campagne publies : listables par anon (USING published_pdf_path
--     IS NOT NULL) -> remplace par RPC get_public_report(token).
--  2. Formulaire de contact : le rate-limit comptait sous la RLS d'anon (qui ne
--     lit rien) -> toujours 0. Comptage deplace dans une fonction SECURITY
--     DEFINER + plafond horaire global.
--  3. Comptes desactives : is_admin/is_commercial/is_operator exigent
--     is_active ; un utilisateur ne peut plus modifier son propre role,
--     is_active ou status (policy RESTRICTIVE) ; activation invited -> active
--     via RPC activate_my_profile().
--  4. Contrats signes / signatures (storage panel-photos) : plus de
--     modification ni suppression une fois le contrat enregistre en base
--     (sauf admin). Reecriture toleree avant enregistrement (reprise apres
--     echec reseau sur le terrain).
--  5. Contrats / avenants : creation reservee admin + operateur actif,
--     created_by force a l'auteur.
--  6. audit_logs : plus d'insertion directe (le trigger SECURITY DEFINER suffit).
--  7. get_next_amendment_number / get_company_public : controle de role.
--  8. Notification "devis accepte" : une seule fois par devis.
--
-- IDEMPOTENT.
-- ============================================================================

-- Garde-fou : on ne doit pas perdre tout acces admin a cause du point 3
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin' AND is_active IS NOT FALSE) THEN
    RAISE EXCEPTION 'Aucun admin actif : migration annulee pour ne pas perdre l''acces admin.';
  END IF;
END $$;

-- ============================================================================
-- 1. Rapports de campagne publics
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_public_report(p_token UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'published_pdf_path', r.published_pdf_path,
    'published_at', r.published_at,
    'campaign', CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
      'name', c.name,
      'start_date', c.start_date,
      'end_date', c.end_date,
      'clients', CASE WHEN cl.id IS NULL THEN NULL ELSE jsonb_build_object('company_name', cl.company_name) END
    ) END
  )
  FROM campaign_reports r
  LEFT JOIN campaigns c ON c.id = r.campaign_id
  LEFT JOIN clients cl ON cl.id = c.client_id
  WHERE r.public_token = p_token
    AND r.published_pdf_path IS NOT NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_report(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_report(UUID) TO anon, authenticated;

DROP POLICY IF EXISTS "Public read published campaign reports" ON public.campaign_reports;

-- ============================================================================
-- 2. Rate-limit formulaire de contact
-- ============================================================================
CREATE OR REPLACE FUNCTION public.contact_rate_ok(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT
    -- 3 demandes / email / 10 min
    (SELECT count(*) FROM contact_requests
      WHERE lower(email) = lower(p_email) AND created_at > now() - interval '10 minutes') < 3
    -- 10 demandes / minute, tous emails confondus
    AND (SELECT count(*) FROM contact_requests WHERE created_at > now() - interval '1 minute') < 10
    -- 30 demandes / heure, tous emails confondus (borne les emails envoyes)
    AND (SELECT count(*) FROM contact_requests WHERE created_at > now() - interval '1 hour') < 30;
$$;

REVOKE ALL ON FUNCTION public.contact_rate_ok(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contact_rate_ok(TEXT) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can submit contact" ON public.contact_requests;
DROP POLICY IF EXISTS "Public can submit contact (rate limited)" ON public.contact_requests;
CREATE POLICY "Public can submit contact" ON public.contact_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.contact_rate_ok(email));

-- ============================================================================
-- 3. Comptes desactives
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND is_active IS NOT FALSE);
$$;

CREATE OR REPLACE FUNCTION public.is_commercial()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'commercial' AND is_active IS NOT FALSE);
$$;

CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'operator' AND is_active IS NOT FALSE);
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_commercial() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_operator() TO anon, authenticated;

-- Un non-admin ne peut pas changer son role, son is_active ni son status
-- (RESTRICTIVE : s'applique quel que soit le nom des policies permissives).
DROP POLICY IF EXISTS "Protect role and activation fields" ON public.profiles;
CREATE POLICY "Protect role and activation fields" ON public.profiles
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (
    public.is_admin()
    OR (
      role = (SELECT p.role FROM public.profiles p WHERE p.id = profiles.id)
      AND is_active IS NOT DISTINCT FROM (SELECT p.is_active FROM public.profiles p WHERE p.id = profiles.id)
      AND status IS NOT DISTINCT FROM (SELECT p.status FROM public.profiles p WHERE p.id = profiles.id)
    )
  );

-- Activation a la premiere connexion : invited -> active, sans toucher is_active
CREATE OR REPLACE FUNCTION public.activate_my_profile()
RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  UPDATE profiles SET status = 'active'
  WHERE id = auth.uid() AND status = 'invited';
$$;

REVOKE ALL ON FUNCTION public.activate_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_my_profile() TO authenticated;

-- ============================================================================
-- 4. Contrats signes et signatures non modifiables apres enregistrement
-- ============================================================================
DROP POLICY IF EXISTS "Contracts immutable once stored (update)" ON storage.objects;
CREATE POLICY "Contracts immutable once stored (update)" ON storage.objects
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    NOT (bucket_id = 'panel-photos' AND (storage.foldername(name))[1] IN ('contracts', 'signatures'))
    OR public.is_admin()
    OR (
      -- Reecriture du PDF toleree tant qu'aucun contrat/avenant ne le reference
      (storage.foldername(name))[1] = 'contracts'
      AND NOT EXISTS (SELECT 1 FROM public.panel_contracts pc WHERE pc.storage_path = storage.objects.name)
      AND NOT EXISTS (SELECT 1 FROM public.contract_amendments ca WHERE ca.storage_path = storage.objects.name)
    )
  );

DROP POLICY IF EXISTS "Contracts immutable once stored (delete)" ON storage.objects;
CREATE POLICY "Contracts immutable once stored (delete)" ON storage.objects
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (
    NOT (bucket_id = 'panel-photos' AND (storage.foldername(name))[1] IN ('contracts', 'signatures'))
    OR public.is_admin()
  );

-- ============================================================================
-- 5. Creation de contrats / avenants
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_contract_author()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_panel_contracts_author ON public.panel_contracts;
CREATE TRIGGER trg_panel_contracts_author
  BEFORE INSERT ON public.panel_contracts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_contract_author();

DROP TRIGGER IF EXISTS trg_contract_amendments_author ON public.contract_amendments;
CREATE TRIGGER trg_contract_amendments_author
  BEFORE INSERT ON public.contract_amendments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_contract_author();

DROP POLICY IF EXISTS "Contracts insert by staff only" ON public.panel_contracts;
CREATE POLICY "Contracts insert by staff only" ON public.panel_contracts
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.is_operator());

DROP POLICY IF EXISTS "Amendments insert by staff only" ON public.contract_amendments;
CREATE POLICY "Amendments insert by staff only" ON public.contract_amendments
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.is_operator());

-- ============================================================================
-- 6. audit_logs : ecriture uniquement par le trigger
-- ============================================================================
DROP POLICY IF EXISTS "System insert audit_logs" ON public.audit_logs;

-- ============================================================================
-- 7. Controle de role sur 2 fonctions SECURITY DEFINER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_next_amendment_number(p_contract_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  contract panel_contracts%ROWTYPE;
  num TEXT;
BEGIN
  IF NOT (public.is_admin() OR public.is_operator()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  SELECT * INTO contract FROM panel_contracts
    WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract % not found', p_contract_id;
  END IF;
  num := contract.contract_number || '-A' ||
         contract.next_amendment_number::TEXT;
  UPDATE panel_contracts
    SET next_amendment_number = next_amendment_number + 1
    WHERE id = p_contract_id;
  RETURN num;
END;
$$;

REVOKE ALL ON FUNCTION public.get_next_amendment_number(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_next_amendment_number(UUID) TO authenticated;

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
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_operator()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  RETURN QUERY
  SELECT cs.id, cs.company_name, cs.address, cs.city, cs.postal_code, cs.siret,
         cs.tva_number, cs.phone, cs.email, cs.logo_path, cs.legal_mentions,
         cs.late_penalty_text, cs.default_panel_type_id,
         cs.email_contract_subject, cs.email_contract_body
  FROM company_settings cs
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_company_public() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_company_public() TO authenticated;

-- ============================================================================
-- 8. Notification "devis accepte" : une seule fois par devis
-- ============================================================================
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS accepted_notified_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.notify_admins_quote_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  commercial_name TEXT;
  client_name TEXT;
  admin_id UUID;
BEGIN
  IF NOT (NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted') THEN
    RETURN NEW;
  END IF;
  IF NOT public.is_commercial() OR OLD.accepted_notified_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  NEW.accepted_notified_at := now();

  SELECT p.full_name INTO commercial_name FROM profiles p WHERE p.id = auth.uid();
  SELECT c.company_name INTO client_name FROM clients c WHERE c.id = NEW.client_id;

  FOR admin_id IN
    SELECT id FROM profiles WHERE role = 'admin' AND is_active = true
  LOOP
    INSERT INTO notifications (user_id, type, title, body, link, metadata)
    VALUES (
      admin_id,
      'quote_accepted',
      'Devis accepté — à facturer',
      format('%s · %s · %s € HT (%s)',
        NEW.quote_number,
        COALESCE(client_name, 'Client'),
        replace(to_char(COALESCE(NEW.total_ht, 0), 'FM999999990.00'), '.', ','),
        COALESCE(commercial_name, 'Commercial')),
      '/admin/quotes/' || NEW.id,
      jsonb_build_object('quote_id', NEW.id, 'commercial_id', NEW.commercial_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_admins_quote_accepted() FROM PUBLIC, anon, authenticated;

-- BEFORE (et non plus AFTER) pour pouvoir marquer accepted_notified_at
DROP TRIGGER IF EXISTS trg_notify_admins_quote_accepted ON public.quotes;
CREATE TRIGGER trg_notify_admins_quote_accepted
  BEFORE UPDATE OF status ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_quote_accepted();

NOTIFY pgrst, 'reload schema';
