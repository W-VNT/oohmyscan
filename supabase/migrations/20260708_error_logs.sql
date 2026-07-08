-- ============================================================================
-- Table error_logs : centralise les erreurs cote client (install, scan, PDF,
-- auth, offline replay...) pour que l'admin puisse voir en back-office ce
-- qui bloque les operateurs sur le terrain (au lieu de leur demander d'ouvrir
-- la console DevTools sur leur telephone).
--
-- Usage :
--   INSERT via wrapper client src/lib/error-logger.ts sur toute erreur
--   catchee dans un flow critique (INSERT DB, upload storage, invoke edge
--   fn, delete rollback...).
--
-- L'admin voit la liste via /admin/logs, filtre par operateur / contexte,
-- peut marquer resolu, voit le stack + metadata en clair.
-- ============================================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Auteur (nullable au cas ou l'erreur arrive avant l'auth)
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_role TEXT,           -- snapshot 'admin' | 'operator' pour filtrer sans join

  -- Categorisation
  context TEXT NOT NULL,    -- 'install', 'scan', 'pdf', 'auth', 'offline_replay', 'other'
  action TEXT NOT NULL,     -- 'insert_location', 'invoke_pdf_gen', 'guarded_back_delete'...

  -- Contenu
  message TEXT NOT NULL,    -- err.message brut
  details JSONB,            -- { stack, code, hint, postgres_details, metadata: {...} }

  -- Contexte tech
  user_agent TEXT,          -- navigator.userAgent
  url TEXT,                 -- window.location.href au moment de l'erreur

  -- Workflow admin
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_context ON error_logs(context);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON error_logs(created_at DESC) WHERE resolved = FALSE;

-- ============================================================================
-- RLS : admin full read/update, tout authenticated peut insert ses propres logs
-- ============================================================================
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read error_logs" ON error_logs;
CREATE POLICY "Admin read error_logs" ON error_logs
  FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admin update error_logs" ON error_logs;
CREATE POLICY "Admin update error_logs" ON error_logs
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated insert error_logs" ON error_logs;
CREATE POLICY "Authenticated insert error_logs" ON error_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Admin delete (cleanup manuel)
DROP POLICY IF EXISTS "Admin delete error_logs" ON error_logs;
CREATE POLICY "Admin delete error_logs" ON error_logs
  FOR DELETE TO authenticated
  USING (is_admin());
