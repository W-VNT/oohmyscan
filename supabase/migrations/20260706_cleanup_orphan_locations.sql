-- ============================================================================
-- Nettoyage des lieux orphelins (sans contract + sans panels)
--
-- Contexte : le wizard install cree le lieu immediatement au form submit,
-- avant l'insert du contract. Si l'operateur abandonne (retour, crash,
-- power off, PDF gen fail), un lieu orphelin reste en DB. Le fix client
-- (guardedBack + delete on confirm) couvre le cas courant mais pas les
-- crashes. Ce cleanup rattrape.
--
-- Usage manuel : lancer via Supabase SQL Editor pour purger les orphelins
-- accumules depuis le debut. Retourne le nombre supprime.
--
-- Usage cron (optionnel) : ajouter un scheduled job Supabase qui execute
-- SELECT cleanup_orphan_locations() toutes les 24h.
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_orphan_locations(
  older_than_hours INT DEFAULT 24
)
RETURNS TABLE(deleted_count INT) AS $$
DECLARE
  n INT;
BEGIN
  WITH victims AS (
    DELETE FROM locations
    WHERE has_contract = FALSE
      AND created_at < NOW() - (older_than_hours || ' hours')::INTERVAL
      AND NOT EXISTS (
        SELECT 1 FROM panels WHERE location_id = locations.id
      )
      -- Double check : au cas ou le trigger has_contract n'aurait pas ete
      -- synchronise, on verifie aussi qu'il n'y a aucun contract.
      AND NOT EXISTS (
        SELECT 1 FROM panel_contracts WHERE location_id = locations.id
      )
    RETURNING id
  )
  SELECT COUNT(*)::INT INTO n FROM victims;
  RETURN QUERY SELECT n;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permet aux admins d'executer manuellement via l'API RPC
-- (l'operateur n'a pas ce droit, seuls admin/service_role).
REVOKE ALL ON FUNCTION cleanup_orphan_locations(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_orphan_locations(INT) TO authenticated;

COMMENT ON FUNCTION cleanup_orphan_locations IS
  'Supprime les lieux sans contract, sans panels, crees il y a plus de N heures. '
  'Usage : SELECT * FROM cleanup_orphan_locations(24); Retourne le nombre supprime.';

-- ============================================================================
-- Nettoyage retroactif : purge des orphelins existants (plus de 1h)
-- On prend une marge courte pour cette premiere passe (1h) car on est sur
-- qu'il n'y a plus de session install active depuis la derniere fermeture
-- de l'app.
-- ============================================================================
SELECT cleanup_orphan_locations(1);
