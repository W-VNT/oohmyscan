-- ============================================================================
-- Fix : cascade la suppression d'un lieu vers ses campaign_free_panels
--
-- Contexte : la migration 20260709_campaign_free_panels.sql avait mis
-- campaign_free_panels.location_id -> locations(id) ON DELETE RESTRICT.
-- Consequence : impossible de supprimer un lieu qui a des panneaux libres
-- (HTTP 409 "still referenced from table campaign_free_panels").
--
-- Fix : CASCADE. Si l'admin supprime le lieu, les rows campaign_free_panels
-- disparaissent aussi. Les photos dans storage/panel-photos ne sont PAS
-- supprimees (accepte comme dette technique — cleanup batch a faire plus
-- tard si necessaire, meme comportement que pour les autres suppressions
-- de la codebase).
-- ============================================================================

ALTER TABLE campaign_free_panels
  DROP CONSTRAINT IF EXISTS campaign_free_panels_location_id_fkey;

ALTER TABLE campaign_free_panels
  ADD CONSTRAINT campaign_free_panels_location_id_fkey
  FOREIGN KEY (location_id)
  REFERENCES locations(id)
  ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';
