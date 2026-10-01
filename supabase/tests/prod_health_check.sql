-- ============================================================================
-- Etat de la prod : verifie que les migrations de securite / facturation /
-- commercial sont bien appliquees + controles de coherence des donnees.
-- Lecture seule. A lancer dans le SQL Editor ; resultat trie, ECHEC en premier.
-- ============================================================================
WITH checks(categorie, verification, ok, detail) AS (
  -- ---------------------------------------------------------------- Migrations
  SELECT 'Migration', 'Role commercial (is_commercial)',
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_commercial'), '20261001_commercial_role_security'
  UNION ALL SELECT 'Migration', 'Fuite devis/factures fermee (policies token supprimees)',
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname IN ('Public read quotes via token', 'Public read invoices via token')),
    '20261001_commercial_role_security'
  UNION ALL SELECT 'Migration', 'Infos societe pour PDF commercial',
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_company_document_settings'), '20261001_commercial_documents'
  UNION ALL SELECT 'Migration', 'Notification devis accepte (trigger)',
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_admins_quote_accepted'), '20261001_commercial_quote_accepted_notify'
  UNION ALL SELECT 'Migration', 'Lot A : rapports publics via RPC',
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_public_report')
    AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read published campaign reports'),
    '20261002_security_hardening_lot_a'
  UNION ALL SELECT 'Migration', 'Lot A : rate-limit contact',
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'contact_rate_ok'), '20261002_security_hardening_lot_a'
  UNION ALL SELECT 'Migration', 'Lot A : role/statut proteges',
    EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Protect role and activation fields'), '20261002_security_hardening_lot_a'
  UNION ALL SELECT 'Migration', 'Lot A : notification acceptee une seule fois',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'accepted_notified_at'),
    '20261002_security_hardening_lot_a'
  UNION ALL SELECT 'Migration', 'Lot C : limites de fichiers (campaign-visuals)',
    EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'campaign-visuals' AND allowed_mime_types IS NOT NULL),
    '20261002_security_lot_c_storage_limits'
  UNION ALL SELECT 'Migration', 'Security Advisor : search_path fige',
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_campaign_reports_updated_at'
            AND array_to_string(proconfig, ',') LIKE '%search_path%'),
    '20261002_advisor_search_path'
  UNION ALL SELECT 'Migration', 'Comptes desactives coupes (policies)',
    (SELECT count(*) FROM pg_policies WHERE policyname = 'Deny inactive users') >= 20,
    '20261002_deny_inactive_users : ' || (SELECT count(*) FROM pg_policies WHERE policyname = 'Deny inactive users') || ' tables'
  UNION ALL SELECT 'Migration', 'Photos : suppression limitee a ses fichiers',
    EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Delete own photos or admin')
    AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can delete photos'),
    '20261002_storage_photos_logo'
  UNION ALL SELECT 'Migration', 'Logo modifiable par admin uniquement',
    EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin upload company-assets' AND with_check LIKE '%is_admin%'),
    '20261002_storage_photos_logo'
  UNION ALL SELECT 'Migration', 'Factures : numero a l''emission',
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'emit_invoice')
    AND EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'invoices' AND column_name = 'invoice_number' AND is_nullable = 'YES'),
    '20261003_invoice_number_on_emit'
  UNION ALL SELECT 'Migration', 'Journaux ne bloquent plus la suppression',
    NOT EXISTS (SELECT 1 FROM pg_constraint c
                JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
                WHERE c.contype = 'f' AND c.confrelid = 'public.profiles'::regclass
                  AND a.attname IN ('actor_id', 'resolved_by') AND c.confdeltype <> 'n'),
    '20261003_logs_fk_set_null'
  UNION ALL SELECT 'Migration', 'Remise enregistree (save_quote_lines)',
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'save_quote_lines' AND prosrc LIKE '%discount_type%'),
    '20260910_save_lines_with_discount / 20261001'
  UNION ALL SELECT 'Migration', 'Numerotation corrigee (modulo + WHERE)',
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_next_invoice_number'
            AND prosrc LIKE '%::INTEGER % 100%' AND prosrc LIKE '%WHERE id = settings.id%'),
    '20260716_fix_numbering_year_modulo'

  -- ---------------------------------------------------------------- Configuration
  UNION ALL SELECT 'Config', 'Bucket panel-photos prive (contrats signes)',
    EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'panel-photos' AND public = false), ''
  UNION ALL SELECT 'Config', 'Bucket document-attachments prive',
    EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'document-attachments' AND public = false), ''
  UNION ALL SELECT 'Config', 'Cle Resend retiree de la base',
    NOT EXISTS (SELECT 1 FROM company_settings WHERE resend_api_key IS NOT NULL), 'doit etre dans les secrets'
  UNION ALL SELECT 'Config', 'Au moins un admin actif',
    EXISTS (SELECT 1 FROM profiles WHERE role = 'admin' AND is_active IS NOT FALSE), ''

  -- ---------------------------------------------------------------- Donnees
  UNION ALL SELECT 'Donnees', 'Compteur facture = derniere emise + 1',
    (SELECT next_invoice_number FROM company_settings LIMIT 1) =
    COALESCE((SELECT MAX((regexp_match(invoice_number, '([0-9]+)$'))[1]::INT) FROM invoices
              WHERE invoice_number IS NOT NULL), 0) + 1,
    'compteur=' || (SELECT next_invoice_number FROM company_settings LIMIT 1)
  UNION ALL SELECT 'Donnees', 'Aucun trou dans les numeros de facture',
    NOT EXISTS (
      WITH n AS (SELECT (regexp_match(invoice_number, '([0-9]+)$'))[1]::INT AS v FROM invoices
                 WHERE invoice_number LIKE 'F-26%' AND invoice_number IS NOT NULL)
      SELECT g FROM generate_series((SELECT MIN(v) FROM n), (SELECT MAX(v) FROM n)) g
      WHERE g NOT IN (SELECT v FROM n)
    ),
    COALESCE((
      WITH n AS (SELECT (regexp_match(invoice_number, '([0-9]+)$'))[1]::INT AS v FROM invoices
                 WHERE invoice_number LIKE 'F-26%' AND invoice_number IS NOT NULL)
      SELECT 'manquants : ' || string_agg(g::text, ', ')
      FROM generate_series((SELECT MIN(v) FROM n), (SELECT MAX(v) FROM n)) g
      WHERE g NOT IN (SELECT v FROM n)
    ), '')
  UNION ALL SELECT 'Donnees', 'Toute facture emise a un numero',
    NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_number IS NULL AND status NOT IN ('draft', 'cancelled')), ''
  UNION ALL SELECT 'Donnees', 'Poses libres sans coordonnees',
    NOT EXISTS (SELECT 1 FROM campaign_free_panels WHERE lat IS NULL OR lng IS NULL),
    (SELECT count(*) FROM campaign_free_panels WHERE lat IS NULL OR lng IS NULL) || ' restantes (bouton Geolocaliser de la carte)'
  UNION ALL SELECT 'Donnees', 'Comptes desactives bannis dans Auth',
    NOT EXISTS (SELECT 1 FROM profiles p JOIN auth.users u ON u.id = p.id
                WHERE p.is_active = false AND (u.banned_until IS NULL OR u.banned_until < now())),
    (SELECT count(*) FROM profiles p JOIN auth.users u ON u.id = p.id
     WHERE p.is_active = false AND (u.banned_until IS NULL OR u.banned_until < now())) || ' non bannis'
)
SELECT CASE WHEN ok THEN 'OK' ELSE 'ECHEC' END AS statut, categorie, verification, detail
FROM checks
ORDER BY ok, categorie, verification;
