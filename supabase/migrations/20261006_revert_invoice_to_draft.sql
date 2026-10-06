-- ============================================================================
-- Repasser une facture emise en brouillon (correction d'une erreur de saisie)
--
-- A utiliser uniquement si la facture n'a pas ete envoyee au client ; sinon
-- -> avoir. La facture GARDE son numero : emit_invoice() le reprend a la
-- reemission (COALESCE), la sequence reste continue, le compteur ne bouge pas.
--
-- Conditions : admin, facture Emise ou En retard, aucun paiement enregistre,
-- aucun avoir actif. Trace automatiquement par le trigger audit_invoices_status.
-- IDEMPOTENT.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.revert_invoice_to_draft(p_invoice_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  inv invoices%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  SELECT * INTO inv FROM invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture introuvable';
  END IF;
  IF inv.status NOT IN ('sent', 'overdue') THEN
    RAISE EXCEPTION 'Seule une facture émise et non payée peut repasser en brouillon';
  END IF;
  IF EXISTS (SELECT 1 FROM payments WHERE invoice_id = p_invoice_id) THEN
    RAISE EXCEPTION 'Un paiement est enregistré sur cette facture : supprime-le d''abord';
  END IF;
  IF EXISTS (SELECT 1 FROM invoices WHERE credit_note_for_id = p_invoice_id AND status <> 'cancelled') THEN
    RAISE EXCEPTION 'Un avoir existe sur cette facture : elle ne peut plus être modifiée';
  END IF;

  UPDATE invoices SET status = 'draft', updated_at = NOW() WHERE id = p_invoice_id;
  RETURN inv.invoice_number;
END;
$$;

REVOKE ALL ON FUNCTION public.revert_invoice_to_draft(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revert_invoice_to_draft(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Verification
SELECT proname FROM pg_proc WHERE proname = 'revert_invoice_to_draft';
