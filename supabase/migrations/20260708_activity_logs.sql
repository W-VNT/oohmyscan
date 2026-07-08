-- ============================================================================
-- Extension du journal : renomme error_logs -> activity_logs et ajoute une
-- colonne severity ('info' | 'warn' | 'error').
--
-- Contexte : les erreurs seules ne suffisent pas pour guider les operateurs
-- terrain. On veut aussi tracer les actions importantes (contract_signed,
-- wizard_abandoned, location_recreated...) pour comprendre le contexte quand
-- un operateur rappelle.
--
-- Backward-compat : les rows existantes gardent severity='error' (default).
-- Le badge sidebar admin compte uniquement severity='error' AND resolved=false.
-- ============================================================================

-- 1. Ajout severity avec default 'error' pour rester compat avec les rows existants
ALTER TABLE error_logs
  ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'error'
  CHECK (severity IN ('info', 'warn', 'error'));

CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
-- Index composite pour le badge : "count des errors non-resolus"
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved_errors
  ON error_logs(created_at DESC)
  WHERE resolved = FALSE AND severity = 'error';

-- 2. Rename final. Postgres renomme automatiquement les indexes/constraints
--    lies (idx_error_logs_*, error_logs_pkey, etc.)
ALTER TABLE error_logs RENAME TO activity_logs;

-- 3. Rename des policies (pas fait par ALTER TABLE)
ALTER POLICY "Admin read error_logs" ON activity_logs RENAME TO "Admin read activity_logs";
ALTER POLICY "Admin update error_logs" ON activity_logs RENAME TO "Admin update activity_logs";
ALTER POLICY "Authenticated insert error_logs" ON activity_logs RENAME TO "Authenticated insert activity_logs";
ALTER POLICY "Admin delete error_logs" ON activity_logs RENAME TO "Admin delete activity_logs";

-- Reload PostgREST pour exposer la nouvelle table + colonne
NOTIFY pgrst, 'reload schema';
