-- ============================================================================
-- Les journaux ne bloquent plus la suppression d'un utilisateur
--
-- audit_logs.actor_id et resolved_by (journal d'erreurs) referencaient
-- profiles sans ON DELETE : supprimer un compte ayant fait la moindre action
-- echouait ("Erreur serveur"). Les journaux gardent l'entree, l'auteur passe
-- a NULL.
-- Les autres references (poses, contrats, devis... : installed_by,
-- created_by, taken_by...) restent bloquantes : c'est voulu, un compte avec
-- un historique metier se desactive, il ne se supprime pas.
-- IDEMPOTENT.
-- ============================================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname, c.conrelid::regclass AS tbl, a.attname AS col
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.profiles'::regclass
      AND a.attname IN ('actor_id', 'resolved_by')
      AND c.confdeltype <> 'n'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.profiles(id) ON DELETE SET NULL',
      r.tbl, r.conname, r.col);
  END LOOP;
END $$;

-- Verification
SELECT c.conrelid::regclass AS table_name, c.conname, c.confdeltype AS on_delete
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
WHERE c.contype = 'f' AND c.confrelid = 'public.profiles'::regclass
  AND a.attname IN ('actor_id', 'resolved_by');
