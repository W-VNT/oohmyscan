-- ============================================================================
-- Test de cloisonnement — role commercial + acces anonyme
--
-- A lancer dans Supabase Dashboard > SQL Editor (tout le fichier d'un coup).
-- Simule une session du PREMIER compte commercial (role = 'commercial') puis
-- une session anonyme, et tente des lectures/ecritures interdites.
-- Tout est annule a la fin (ROLLBACK) : aucune donnee n'est modifiee.
--
-- Resultat : un tableau trie avec les echecs (ok = false) en premier.
-- ============================================================================
BEGIN;

CREATE TEMP TABLE _cloison (
  ordre INT, verification TEXT, attendu TEXT, obtenu TEXT, ok BOOLEAN
);
GRANT ALL ON _cloison TO authenticated, anon;

-- Identifiants de reference (lus en tant qu'admin DB avant de changer de role)
SELECT set_config('test.commercial',
  COALESCE((SELECT id::text FROM profiles WHERE role = 'commercial' ORDER BY created_at LIMIT 1), ''), true);
SELECT set_config('test.other_admin',
  COALESCE((SELECT id::text FROM profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1), ''), true);
SELECT set_config('test.foreign_client',
  COALESCE((SELECT id::text FROM clients WHERE commercial_id IS DISTINCT FROM NULLIF(current_setting('test.commercial'), '')::uuid LIMIT 1), ''), true);
SELECT set_config('test.foreign_quote',
  COALESCE((SELECT id::text FROM quotes WHERE commercial_id IS DISTINCT FROM NULLIF(current_setting('test.commercial'), '')::uuid LIMIT 1), ''), true);
SELECT set_config('test.invoice', COALESCE((SELECT id::text FROM invoices LIMIT 1), ''), true);
SELECT set_config('test.location', COALESCE((SELECT id::text FROM locations LIMIT 1), ''), true);

DO $$
BEGIN
  IF current_setting('test.commercial') = '' THEN
    RAISE EXCEPTION 'Aucun compte commercial en base : invite un commercial avant de lancer ce test.';
  END IF;
END $$;

-- Session simulee du commercial
SELECT set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.commercial'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  me UUID := auth.uid();
  foreign_client UUID := NULLIF(current_setting('test.foreign_client'), '')::uuid;
  foreign_quote UUID := NULLIF(current_setting('test.foreign_quote'), '')::uuid;
  other_admin UUID := NULLIF(current_setting('test.other_admin'), '')::uuid;
  an_invoice UUID := NULLIF(current_setting('test.invoice'), '')::uuid;
  a_location UUID := NULLIF(current_setting('test.location'), '')::uuid;
  t TEXT;
  n BIGINT;
  rc BIGINT;
  v UUID;
  j JSONB;
  res TEXT;
BEGIN
  INSERT INTO _cloison VALUES (0, 'Session simulee = commercial', 'is_commercial() = true',
    public.is_commercial()::text, public.is_commercial());

  -- ---------------------------------------------------------------- Lectures interdites
  FOREACH t IN ARRAY ARRAY[
    'invoices', 'invoice_lines', 'payments', 'dunning_history', 'recurring_invoices',
    'campaigns', 'campaign_visuals', 'campaign_reports', 'campaign_deposits',
    'campaign_free_panels', 'panel_campaigns', 'panels', 'panel_photos', 'locations',
    'panel_contracts', 'contract_amendments', 'qr_stock', 'panel_formats',
    'company_settings', 'quote_templates', 'document_attachments', 'contact_requests',
    'potential_requests', 'audit_logs', 'activity_logs', 'error_logs'
  ] LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      INSERT INTO _cloison VALUES (10, 'Lecture ' || t, '0', n::text, n = 0);
    EXCEPTION
      WHEN undefined_table THEN NULL;
      WHEN insufficient_privilege THEN
        INSERT INTO _cloison VALUES (10, 'Lecture ' || t, '0', 'refuse (droits)', true);
    END;
  END LOOP;

  -- ---------------------------------------------------------------- Lectures limitees a son perimetre
  SELECT count(*) INTO n FROM clients WHERE commercial_id IS DISTINCT FROM me;
  INSERT INTO _cloison VALUES (20, 'Clients d''un autre visibles', '0', n::text, n = 0);

  SELECT count(*) INTO n FROM quotes WHERE commercial_id IS DISTINCT FROM me;
  INSERT INTO _cloison VALUES (20, 'Devis d''un autre visibles', '0', n::text, n = 0);

  SELECT count(*) INTO n FROM quote_lines ql
  WHERE NOT EXISTS (SELECT 1 FROM quotes q WHERE q.id = ql.quote_id AND q.commercial_id = me);
  INSERT INTO _cloison VALUES (20, 'Lignes de devis d''un autre visibles', '0', n::text, n = 0);

  SELECT count(*) INTO n FROM profiles WHERE id <> me;
  INSERT INTO _cloison VALUES (20, 'Profils des autres utilisateurs visibles', '0', n::text, n = 0);

  BEGIN
    SELECT count(*) INTO n FROM notifications WHERE user_id <> me;
    INSERT INTO _cloison VALUES (20, 'Notifications des autres visibles', '0', n::text, n = 0);
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    SELECT count(*) INTO n FROM push_subscriptions WHERE user_id <> me;
    INSERT INTO _cloison VALUES (20, 'Abonnements push des autres visibles', '0', n::text, n = 0);
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  SELECT count(*) INTO n FROM storage.objects
  WHERE bucket_id NOT IN ('avatars', 'company-assets', 'company-pdfs');
  INSERT INTO _cloison VALUES (20, 'Fichiers hors buckets autorises visibles', '0', n::text, n = 0);

  -- ---------------------------------------------------------------- Lectures autorisees (info)
  SELECT count(*) INTO n FROM service_catalog;
  INSERT INTO _cloison VALUES (30, 'Lecture catalogue prestations (autorise)', 'lisible', n::text || ' lignes', true);

  BEGIN
    SELECT to_jsonb(d) INTO j FROM public.get_company_document_settings() d;
    INSERT INTO _cloison VALUES (30, 'Infos societe pour PDF (autorise, sans cles API)',
      'pas de resend_api_key', CASE WHEN j ? 'resend_api_key' THEN 'cle API exposee' ELSE 'OK' END,
      NOT (j ? 'resend_api_key'));
  EXCEPTION WHEN others THEN
    INSERT INTO _cloison VALUES (30, 'Infos societe pour PDF (autorise)', 'lisible',
      'ERREUR ' || SQLSTATE || ' ' || SQLERRM || ' (migration lot 2 appliquee ?)', false);
  END;

  -- ---------------------------------------------------------------- Ecritures
  -- Creer un client en l'attribuant a quelqu'un d'autre -> doit etre force a soi
  res := NULL;
  BEGIN
    INSERT INTO clients (company_name, commercial_id) VALUES ('__test_cloisonnement__', other_admin)
    RETURNING commercial_id INTO v;
    res := CASE WHEN v = me THEN 'proprietaire force = moi' ELSE 'proprietaire = autre' END;
  EXCEPTION WHEN others THEN res := 'ERREUR ' || SQLSTATE || ' ' || SQLERRM;
  END;
  INSERT INTO _cloison VALUES (40, 'Creer un client au nom d''un autre', 'proprietaire force = moi', res,
    res = 'proprietaire force = moi');

  IF foreign_client IS NOT NULL THEN
    UPDATE clients SET notes = notes WHERE id = foreign_client;
    GET DIAGNOSTICS rc = ROW_COUNT;
    INSERT INTO _cloison VALUES (40, 'Modifier le client d''un autre', '0 ligne', rc::text || ' ligne(s)', rc = 0);

    res := NULL;
    BEGIN
      INSERT INTO quotes (quote_number, client_id) VALUES ('TEST-CLOISON-' || gen_random_uuid(), foreign_client);
      res := 'accepte';
    EXCEPTION WHEN others THEN res := SQLSTATE;
    END;
    INSERT INTO _cloison VALUES (40, 'Creer un devis sur le client d''un autre', 'refuse (42501)', res, res = '42501');
  END IF;

  IF foreign_quote IS NOT NULL THEN
    UPDATE quotes SET notes = notes WHERE id = foreign_quote;
    GET DIAGNOSTICS rc = ROW_COUNT;
    INSERT INTO _cloison VALUES (40, 'Modifier le devis d''un autre', '0 ligne', rc::text || ' ligne(s)', rc = 0);

    res := NULL;
    BEGIN
      INSERT INTO quote_lines (quote_id, description) VALUES (foreign_quote, 'test');
      res := 'accepte';
    EXCEPTION WHEN others THEN res := SQLSTATE;
    END;
    INSERT INTO _cloison VALUES (40, 'Ajouter une ligne au devis d''un autre', 'refuse (42501)', res, res = '42501');

    res := NULL;
    BEGIN
      PERFORM public.save_quote_lines(foreign_quote, '[]'::jsonb, 0, 0, 0);
      res := 'accepte';
    EXCEPTION WHEN others THEN res := SQLSTATE;
    END;
    INSERT INTO _cloison VALUES (40, 'RPC save_quote_lines sur le devis d''un autre', 'refuse (P0001)', res, res = 'P0001');
  END IF;

  IF an_invoice IS NOT NULL THEN
    UPDATE invoices SET notes = notes WHERE id = an_invoice;
    GET DIAGNOSTICS rc = ROW_COUNT;
    INSERT INTO _cloison VALUES (40, 'Modifier une facture', '0 ligne', rc::text || ' ligne(s)', rc = 0);

    res := NULL;
    BEGIN
      PERFORM public.save_invoice_lines(an_invoice, '[]'::jsonb, 0, 0, 0);
      res := 'accepte';
    EXCEPTION WHEN others THEN res := SQLSTATE;
    END;
    INSERT INTO _cloison VALUES (40, 'RPC save_invoice_lines', 'refuse (P0001)', res, res = 'P0001');
  END IF;

  IF a_location IS NOT NULL THEN
    res := NULL;
    BEGIN
      INSERT INTO panel_contracts (location_id) VALUES (a_location);
      res := 'accepte';
    EXCEPTION WHEN others THEN res := SQLSTATE;
    END;
    INSERT INTO _cloison VALUES (40, 'Creer un contrat terrain', 'refuse (42501)', res, res = '42501');
  END IF;

  IF other_admin IS NOT NULL THEN
    res := NULL;
    BEGIN
      INSERT INTO notifications (user_id, type, title, body) VALUES (other_admin, 'test', 'test', 'test');
      res := 'accepte';
    EXCEPTION WHEN others THEN res := SQLSTATE;
    END;
    INSERT INTO _cloison VALUES (40, 'Envoyer une notification a un admin', 'refuse (42501)', res, res = '42501');
  END IF;

  res := NULL;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('panel-photos', '__test_cloisonnement__');
    res := 'accepte';
  EXCEPTION WHEN others THEN res := SQLSTATE;
  END;
  INSERT INTO _cloison VALUES (40, 'Ecrire dans le bucket panel-photos', 'refuse (42501)', res, res = '42501');

  -- ---------------------------------------------------------------- Escalade de privileges
  res := NULL;
  BEGIN
    UPDATE profiles SET role = 'admin' WHERE id = me;
    GET DIAGNOSTICS rc = ROW_COUNT;
    res := CASE WHEN rc = 0 THEN '0 ligne' ELSE 'MODIFIE' END;
  EXCEPTION WHEN others THEN res := SQLSTATE;
  END;
  INSERT INTO _cloison VALUES (50, 'Se passer admin (UPDATE profiles.role)', 'refuse', res, res IN ('0 ligne', '42501'));

  res := NULL;
  BEGIN
    UPDATE profiles SET is_active = false WHERE id = me;
    GET DIAGNOSTICS rc = ROW_COUNT;
    res := CASE WHEN rc = 0 THEN '0 ligne' ELSE 'MODIFIE' END;
  EXCEPTION WHEN others THEN res := SQLSTATE;
  END;
  INSERT INTO _cloison VALUES (50, 'Modifier son propre statut actif (is_active)', 'refuse', res, res IN ('0 ligne', '42501'));

  SELECT public.admin_update_user_role(me, 'admin') INTO j;
  INSERT INTO _cloison VALUES (50, 'Se passer admin (RPC admin_update_user_role)', 'success = false',
    j::text, COALESCE((j ->> 'success')::boolean, false) = false);

  res := NULL;
  BEGIN
    PERFORM public.get_next_invoice_number();
    res := 'accepte';
  EXCEPTION WHEN others THEN res := SQLSTATE;
  END;
  INSERT INTO _cloison VALUES (50, 'RPC get_next_invoice_number', 'refuse (P0001)', res, res = 'P0001');

  res := NULL;
  BEGIN
    PERFORM public.cleanup_orphan_locations(0);
    res := 'accepte';
  EXCEPTION WHEN others THEN res := SQLSTATE;
  END;
  INSERT INTO _cloison VALUES (50, 'RPC cleanup_orphan_locations', 'refuse (P0001)', res, res = 'P0001');
END $$;

-- Session anonyme (visiteur non connecte, cle publique du site)
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
DECLARE
  t TEXT;
  n BIGINT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'quotes', 'quote_lines', 'invoices', 'invoice_lines', 'payments', 'clients', 'profiles',
    'company_settings', 'panels', 'panel_photos', 'campaigns', 'locations', 'panel_contracts',
    'campaign_free_panels', 'contact_requests', 'potential_requests', 'service_catalog',
    'notifications', 'activity_logs'
  ] LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      INSERT INTO _cloison VALUES (60, 'Anonyme : lecture ' || t, '0', n::text, n = 0);
    EXCEPTION
      WHEN undefined_table THEN NULL;
      WHEN insufficient_privilege THEN
        INSERT INTO _cloison VALUES (60, 'Anonyme : lecture ' || t, '0', 'refuse (droits)', true);
    END;
  END LOOP;

  SELECT count(*) INTO n FROM storage.objects;
  INSERT INTO _cloison VALUES (60, 'Anonyme : liste des fichiers stockes', '0', n::text, n = 0);

  SELECT count(*) INTO n FROM campaign_reports;
  INSERT INTO _cloison VALUES (60, 'Anonyme : liste des rapports de campagne publies', '0', n::text, n = 0);

  BEGIN
    INSERT INTO audit_logs (action, table_name) VALUES ('test', 'test');
    INSERT INTO _cloison VALUES (60, 'Anonyme : ecrire un faux journal d''audit', 'refuse', 'accepte', false);
  EXCEPTION WHEN others THEN
    INSERT INTO _cloison VALUES (60, 'Anonyme : ecrire un faux journal d''audit', 'refuse', 'refuse (' || SQLSTATE || ')', true);
  END;
END $$;

RESET ROLE;

SELECT
  CASE WHEN ok THEN 'OK' ELSE 'ECHEC' END AS statut,
  verification, attendu, obtenu
FROM _cloison
ORDER BY ok, ordre, verification;

ROLLBACK;
