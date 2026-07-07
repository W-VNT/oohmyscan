-- ============================================================================
-- Fix : re-autorise le flow operateur casse par le security hardening v1
--
-- Contexte : la migration 20260707_security_hardening.sql a drop les policies
-- permissives USING(true) sur locations et panel_contracts. Deux fonctions
-- SECURITY INVOKER dependaient de ces permissions ouvertes :
--
--   1. sync_location_has_contract (TRIGGER AFTER INSERT/DELETE ON panel_contracts)
--      -> UPDATE locations SET has_contract=..., contract_signed_at=...
--      Sans SECURITY DEFINER, s'execute avec les droits de l'appelant.
--      Operateur n'a plus UPDATE sur locations -> le trigger echoue -> l'INSERT
--      panel_contracts echoue -> plus de signature contrat possible en operateur.
--
--   2. get_next_amendment_number (RPC callable par operateur pour avenants)
--      -> UPDATE panel_contracts SET next_amendment_number = ...+1
--      Sans SECURITY DEFINER, meme probleme, operateur n'a plus UPDATE sur
--      panel_contracts -> plus d'avenant possible en operateur.
--
-- Fix : convertir les 2 en SECURITY DEFINER + search_path fige.
-- Securite maintenue :
--   - sync_location_has_contract est un trigger qui n'est appelable que via
--     INSERT/DELETE sur panel_contracts (qui a deja sa propre RLS).
--   - get_next_amendment_number verifie que le contract existe via LOCK/SELECT
--     FOR UPDATE et retourne son numero. L'operateur qui appelerait sur un
--     contract random incrementerait un compteur, pas d'exfiltration.
-- ============================================================================

-- ============================================================================
-- 1. sync_location_has_contract : trigger sur panel_contracts INSERT/DELETE
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_location_has_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE locations
      SET has_contract = TRUE, contract_signed_at = NEW.signed_at, updated_at = NOW()
      WHERE id = NEW.location_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE locations
      SET has_contract = EXISTS(
        SELECT 1 FROM panel_contracts WHERE location_id = OLD.location_id AND id != OLD.id
      ),
      contract_signed_at = CASE
        WHEN NOT EXISTS(SELECT 1 FROM panel_contracts WHERE location_id = OLD.location_id AND id != OLD.id)
        THEN NULL
        ELSE contract_signed_at
      END,
      updated_at = NOW()
      WHERE id = OLD.location_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger existant continue de pointer sur la meme fonction, rien a recreer.

-- Re-apply REVOKE (v1 avait REVOKE ALL FROM PUBLIC/anon/authenticated pour ce
-- trigger vu qu'il n'est pas cense etre appele en RPC).
REVOKE ALL ON FUNCTION public.sync_location_has_contract() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_location_has_contract() FROM anon;
REVOKE ALL ON FUNCTION public.sync_location_has_contract() FROM authenticated;

-- ============================================================================
-- 2. get_next_amendment_number : RPC appele par l'operateur pour avenants
-- ============================================================================
CREATE OR REPLACE FUNCTION get_next_amendment_number(p_contract_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  contract panel_contracts%ROWTYPE;
  num TEXT;
BEGIN
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

-- Grants : appelable en RPC par authenticated (operateur + admin)
REVOKE EXECUTE ON FUNCTION public.get_next_amendment_number(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_next_amendment_number(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_next_amendment_number(UUID) TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
