-- ============================================================================
-- Rename FKs et policy names historiques (error_logs -> activity_logs)
--
-- Bug : la migration 20260708_activity_logs.sql renommait la table error_logs
-- en activity_logs et renommait ses policies, mais les FOREIGN KEY
-- constraints ne suivent pas automatiquement le rename de table dans
-- Postgres. Consequence :
--   - FK `error_logs_user_id_fkey` existe toujours (pointe vers profiles)
--   - FK `error_logs_resolved_by_fkey` existe toujours (pointe vers profiles)
-- Or le hook useActivityLogs utilise le hint `activity_logs_user_id_fkey`
-- dans le select imbrique -> PostgREST ne trouve pas la relation -> HTTP 400
-- -> la page /admin/logs affiche vide meme si des rows existent.
--
-- Fix : renomme les 2 FK vers leur nom coherent avec le nom de table.
-- ============================================================================

ALTER TABLE activity_logs
  RENAME CONSTRAINT error_logs_user_id_fkey TO activity_logs_user_id_fkey;

ALTER TABLE activity_logs
  RENAME CONSTRAINT error_logs_resolved_by_fkey TO activity_logs_resolved_by_fkey;

NOTIFY pgrst, 'reload schema';
