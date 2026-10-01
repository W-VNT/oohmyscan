-- ============================================================================
-- Numero de facture attribue a l'EMISSION (plus a la creation du brouillon)
--
-- Avant : chaque brouillon consommait un numero. Un brouillon abandonne ou
-- un INSERT en echec laissait un trou dans la sequence (art. 289 CGI :
-- numerotation chronologique et continue), corrige a la main en SQL.
--
-- Maintenant :
--  - un brouillon n'a pas de numero (invoice_number NULL) ;
--  - la RPC emit_invoice() attribue le numero, la date et l'echeance et
--    passe la facture en 'sent' (libelle "Emise") dans UNE transaction :
--    si quoi que ce soit echoue, le compteur n'avance pas -> zero trou.
--  - les devis ne changent pas (numero des la creation).
--
-- Reprise de l'existant : les brouillons numerotes APRES la derniere facture
-- emise perdent leur numero (le compteur recule d'autant). Les brouillons
-- plus anciens, au milieu de la sequence, le gardent (le retirer creerait
-- un trou).
-- IDEMPOTENT.
-- ============================================================================

-- 1. Numero optionnel pour les brouillons
ALTER TABLE public.invoices ALTER COLUMN invoice_number DROP NOT NULL;

-- 2. Reprise des brouillons de fin de sequence + recalage du compteur
DO $$
DECLARE
  max_emitted INT;
BEGIN
  SELECT COALESCE(MAX((regexp_match(invoice_number, '([0-9]+)$'))[1]::INT), 0)
  INTO max_emitted
  FROM public.invoices
  WHERE status <> 'draft' AND invoice_number IS NOT NULL;

  UPDATE public.invoices
  SET invoice_number = NULL
  WHERE status = 'draft'
    AND invoice_number IS NOT NULL
    AND (regexp_match(invoice_number, '([0-9]+)$'))[1]::INT > max_emitted;

  UPDATE public.company_settings
  SET next_invoice_number = max_emitted + 1
  WHERE id = (SELECT id FROM public.company_settings LIMIT 1);
END $$;

-- 3. Une facture emise a forcement un numero
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_number_when_emitted;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_number_when_emitted
  CHECK (invoice_number IS NOT NULL OR status IN ('draft', 'cancelled'));

-- 4. Emission atomique
CREATE OR REPLACE FUNCTION public.emit_invoice(
  p_invoice_id UUID,
  p_issued_at DATE,
  p_due_at DATE
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  inv invoices%ROWTYPE;
  num TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  SELECT * INTO inv FROM invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture introuvable';
  END IF;
  IF inv.status <> 'draft' THEN
    RAISE EXCEPTION 'Cette facture est déjà émise';
  END IF;

  -- Les anciens brouillons du milieu de sequence gardent leur numero
  num := COALESCE(inv.invoice_number, public.get_next_invoice_number());

  UPDATE invoices
  SET invoice_number = num,
      status = 'sent',
      issued_at = p_issued_at,
      due_at = p_due_at,
      updated_at = NOW()
  WHERE id = p_invoice_id;

  RETURN num;
END;
$$;

REVOKE ALL ON FUNCTION public.emit_invoice(UUID, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.emit_invoice(UUID, DATE, DATE) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Verification : brouillons et compteur apres reprise
SELECT invoice_number, status, created_at,
       (SELECT next_invoice_number FROM public.company_settings LIMIT 1) AS prochain_numero
FROM public.invoices
WHERE status = 'draft'
ORDER BY created_at;
