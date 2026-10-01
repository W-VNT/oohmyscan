-- ============================================================================
-- Lot 1 — Role "commercial" + cloisonnement + correctifs de securite
--
-- 1. Nouveau role 'commercial' (profiles.role) + helpers is_commercial() /
--    is_operator().
-- 2. Policies RESTRICTIVE (AND-ees avec toutes les autres) qui interdisent
--    au commercial les tables terrain + finance. On n'a pas besoin de
--    connaitre le nom exact des policies permissives existantes en prod.
-- 3. Commercial : CRUD sur SES clients / devis / lignes (commercial_id =
--    auth.uid(), force par trigger), lecture du catalogue prestations.
-- 4. RPC get_next_quote_number / save_quote_lines ouvertes au commercial
--    (sur ses devis uniquement).
-- 5. FIX FUITE : les policies "Public read quotes/invoices via token"
--    etaient USING (true) sans role -> toutes les tables quotes et invoices
--    lisibles par n'importe qui avec la cle anon. Remplacees par une RPC
--    get_public_document(token) qui ne renvoie que le document demande.
-- 6. FIX PERTE DE DONNEES : cleanup_orphan_locations() supprimait les lieux
--    sans contrat ni panneau QR = les lieux de pose libre, et la cascade
--    effacait leurs campaign_free_panels. Appelable par tout authentifie.
--    -> reserve admin/SQL editor + exclut les lieux avec poses libres.
--
-- IDEMPOTENT : peut etre rejouee sans risque.
-- ============================================================================

-- ============================================================================
-- 1. Role 'commercial'
-- ============================================================================
DO $$
DECLARE c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'operator', 'commercial'));

CREATE OR REPLACE FUNCTION public.is_commercial()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'commercial');
$$;

CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'operator');
$$;

-- Callables par anon aussi (meme lecon que is_admin : une session au JWT
-- expire retombe en anon et les policies cassent sinon). Renvoient FALSE.
GRANT EXECUTE ON FUNCTION public.is_commercial() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_operator() TO anon, authenticated;

-- ============================================================================
-- 2. Interdiction commercial sur terrain + finance (RESTRICTIVE)
-- ============================================================================
DO $$
DECLARE
  t TEXT;
  denied_tables TEXT[] := ARRAY[
    -- terrain
    'panels', 'panel_photos', 'panel_campaigns', 'campaigns', 'campaign_visuals',
    'campaign_reports', 'campaign_deposits', 'campaign_free_panels', 'locations',
    'panel_contracts', 'contract_amendments', 'panel_formats', 'qr_stock',
    -- finance / admin
    'invoices', 'invoice_lines', 'payments', 'dunning_history', 'recurring_invoices',
    'company_settings', 'quote_templates', 'document_attachments',
    'potential_requests', 'contact_requests', 'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY denied_tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "Deny commercial" ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY "Deny commercial" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
        'USING (NOT public.is_commercial()) WITH CHECK (NOT public.is_commercial())', t);
    END IF;
  END LOOP;
END $$;

-- Profils : le commercial ne lit que le sien
DROP POLICY IF EXISTS "Commercial own profile only" ON public.profiles;
CREATE POLICY "Commercial own profile only" ON public.profiles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT public.is_commercial() OR id = auth.uid())
  WITH CHECK (NOT public.is_commercial() OR id = auth.uid());

-- ============================================================================
-- 3. Clients / devis / lignes : perimetre du commercial
-- ============================================================================

-- Trigger : un commercial est toujours proprietaire de ce qu'il cree/modifie
CREATE OR REPLACE FUNCTION public.enforce_commercial_owner()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.is_commercial() THEN
    NEW.commercial_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_commercial_owner ON public.clients;
CREATE TRIGGER trg_clients_commercial_owner
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.enforce_commercial_owner();

DROP TRIGGER IF EXISTS trg_quotes_commercial_owner ON public.quotes;
CREATE TRIGGER trg_quotes_commercial_owner
  BEFORE INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_commercial_owner();

-- Clients
DROP POLICY IF EXISTS "Commercial manage own clients" ON public.clients;
CREATE POLICY "Commercial manage own clients" ON public.clients
  FOR ALL TO authenticated
  USING (public.is_commercial() AND commercial_id = auth.uid())
  WITH CHECK (public.is_commercial() AND commercial_id = auth.uid());

DROP POLICY IF EXISTS "Commercial clients scope" ON public.clients;
CREATE POLICY "Commercial clients scope" ON public.clients
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT public.is_commercial() OR commercial_id = auth.uid())
  WITH CHECK (NOT public.is_commercial() OR commercial_id = auth.uid());

-- Devis (le client choisi doit appartenir au commercial)
DROP POLICY IF EXISTS "Commercial manage own quotes" ON public.quotes;
CREATE POLICY "Commercial manage own quotes" ON public.quotes
  FOR ALL TO authenticated
  USING (public.is_commercial() AND commercial_id = auth.uid())
  WITH CHECK (
    public.is_commercial()
    AND commercial_id = auth.uid()
    AND (
      quotes.client_id IS NULL
      OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = quotes.client_id AND c.commercial_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Commercial quotes scope" ON public.quotes;
CREATE POLICY "Commercial quotes scope" ON public.quotes
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT public.is_commercial() OR commercial_id = auth.uid())
  WITH CHECK (NOT public.is_commercial() OR commercial_id = auth.uid());

-- Lignes de devis (via le devis parent)
DROP POLICY IF EXISTS "Commercial manage own quote_lines" ON public.quote_lines;
CREATE POLICY "Commercial manage own quote_lines" ON public.quote_lines
  FOR ALL TO authenticated
  USING (public.is_commercial() AND EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = quote_lines.quote_id AND q.commercial_id = auth.uid()))
  WITH CHECK (public.is_commercial() AND EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = quote_lines.quote_id AND q.commercial_id = auth.uid()));

DROP POLICY IF EXISTS "Commercial quote_lines scope" ON public.quote_lines;
CREATE POLICY "Commercial quote_lines scope" ON public.quote_lines
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT public.is_commercial() OR EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = quote_lines.quote_id AND q.commercial_id = auth.uid()))
  WITH CHECK (NOT public.is_commercial() OR EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = quote_lines.quote_id AND q.commercial_id = auth.uid()));

-- Catalogue prestations : lecture seule
DROP POLICY IF EXISTS "Commercial read service_catalog" ON public.service_catalog;
CREATE POLICY "Commercial read service_catalog" ON public.service_catalog
  FOR SELECT TO authenticated
  USING (public.is_commercial());

-- ============================================================================
-- 4. RPC devis ouvertes au commercial
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_next_quote_number()
RETURNS TEXT AS $$
DECLARE
  settings company_settings%ROWTYPE;
  num TEXT;
BEGIN
  IF NOT (public.is_admin() OR public.is_commercial()) THEN
    RAISE EXCEPTION 'Permission denied: admin or commercial role required';
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

CREATE OR REPLACE FUNCTION public.save_quote_lines(
  p_quote_id UUID,
  p_lines JSONB,
  p_total_ht DECIMAL,
  p_total_tva DECIMAL,
  p_total_ttc DECIMAL
) RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF NOT (
      public.is_commercial()
      AND EXISTS (SELECT 1 FROM quotes WHERE id = p_quote_id AND commercial_id = auth.uid())
    ) THEN
      RAISE EXCEPTION 'Permission denied';
    END IF;
  END IF;

  DELETE FROM quote_lines WHERE quote_id = p_quote_id;

  IF jsonb_array_length(COALESCE(p_lines, '[]'::JSONB)) > 0 THEN
    INSERT INTO quote_lines (
      quote_id, description, quantity, unit, unit_price, tva_rate,
      total_ht, sort_order,
      discount_type, discount_value, line_type, service_catalog_id
    )
    SELECT
      p_quote_id,
      (line->>'description')::TEXT,
      (line->>'quantity')::DECIMAL,
      COALESCE((line->>'unit')::TEXT, 'unité'),
      (line->>'unit_price')::DECIMAL,
      (line->>'tva_rate')::DECIMAL,
      (line->>'total_ht')::DECIMAL,
      (line->>'sort_order')::INTEGER,
      NULLIF(line->>'discount_type', '')::TEXT,
      COALESCE((line->>'discount_value')::DECIMAL, 0),
      COALESCE((line->>'line_type')::TEXT, 'item'),
      NULLIF(line->>'service_catalog_id', '')::UUID
    FROM jsonb_array_elements(p_lines) AS line;
  END IF;

  UPDATE quotes
  SET total_ht = p_total_ht,
      total_tva = p_total_tva,
      total_ttc = p_total_ttc,
      updated_at = NOW()
  WHERE id = p_quote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.get_next_quote_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_quote_lines(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_next_quote_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_quote_lines(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL) TO authenticated;

-- Changement de role : accepter 'commercial'
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  caller_id UUID := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can change roles');
  END IF;
  IF new_role NOT IN ('admin', 'operator', 'commercial') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;
  IF target_user_id = caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot change your own role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = target_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  UPDATE profiles SET role = new_role WHERE id = target_user_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(UUID, TEXT) TO authenticated;

-- ============================================================================
-- 5. Stockage : le commercial n'accede qu'aux buckets utiles
-- ============================================================================
DROP POLICY IF EXISTS "Deny commercial storage" ON storage.objects;
CREATE POLICY "Deny commercial storage" ON storage.objects
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT public.is_commercial() OR bucket_id IN ('avatars', 'company-assets', 'company-pdfs'))
  WITH CHECK (NOT public.is_commercial() OR bucket_id = 'avatars');

-- ============================================================================
-- 6. FIX FUITE : portail public devis/factures
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_public_document(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  r JSONB;
BEGIN
  SELECT jsonb_build_object('type', 'quote', 'data', jsonb_build_object(
    'id', q.id, 'quote_number', q.quote_number, 'issued_at', q.issued_at,
    'valid_until', q.valid_until, 'status', q.status, 'total_ht', q.total_ht,
    'total_ttc', q.total_ttc, 'notes', q.notes, 'client_reference', q.client_reference))
  INTO r
  FROM quotes q
  WHERE q.public_token = p_token
    AND (q.public_token_expires_at IS NULL OR q.public_token_expires_at > NOW());
  IF r IS NOT NULL THEN
    RETURN r;
  END IF;

  SELECT jsonb_build_object('type', 'invoice', 'data', jsonb_build_object(
    'id', i.id, 'invoice_number', i.invoice_number, 'issued_at', i.issued_at,
    'due_at', i.due_at, 'status', i.status, 'invoice_type', i.invoice_type,
    'total_ht', i.total_ht, 'total_ttc', i.total_ttc, 'notes', i.notes,
    'client_reference', i.client_reference))
  INTO r
  FROM invoices i
  WHERE i.public_token = p_token
    AND (i.public_token_expires_at IS NULL OR i.public_token_expires_at > NOW());
  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_document(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_document(UUID) TO anon, authenticated;

DROP POLICY IF EXISTS "Public read quotes via token" ON public.quotes;
DROP POLICY IF EXISTS "Public read invoices via token" ON public.invoices;

-- ============================================================================
-- 7. FIX PERTE DE DONNEES : cleanup_orphan_locations
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_orphan_locations(
  older_than_hours INT DEFAULT 24
)
RETURNS TABLE(deleted_count INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  n INT;
BEGIN
  -- auth.uid() NULL = SQL editor / cron (autorise). Sinon admin uniquement.
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  WITH victims AS (
    DELETE FROM locations
    WHERE has_contract = FALSE
      AND created_at < NOW() - (older_than_hours || ' hours')::INTERVAL
      AND NOT EXISTS (SELECT 1 FROM panels WHERE location_id = locations.id)
      AND NOT EXISTS (SELECT 1 FROM panel_contracts WHERE location_id = locations.id)
      -- Un lieu de pose libre n'est PAS orphelin (la cascade effacerait
      -- ses campaign_free_panels).
      AND NOT EXISTS (SELECT 1 FROM campaign_free_panels WHERE location_id = locations.id)
    RETURNING id
  )
  SELECT COUNT(*)::INT INTO n FROM victims;
  RETURN QUERY SELECT n;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_orphan_locations(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_orphan_locations(INT) TO authenticated;

NOTIFY pgrst, 'reload schema';
