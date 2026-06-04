-- Migration: Add admin workflow fields to contact_requests
-- Status: nouveau (default) / contacte / converti / perdu / spam
-- Plus handled_by, handled_at for tracking, and notes for follow-up

ALTER TABLE contact_requests
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'nouveau'
    CHECK (status IN ('nouveau', 'contacte', 'converti', 'perdu', 'spam')),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS handled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ;

-- Index pour filtrer/trier rapidement
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON contact_requests (status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at_desc ON contact_requests (created_at DESC);

-- Admins peuvent mettre a jour (statut, notes, handled_by)
CREATE POLICY "Admin updates contacts" ON contact_requests
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

-- Admins peuvent supprimer (spam cleanup)
CREATE POLICY "Admin deletes contacts" ON contact_requests
  FOR DELETE USING (is_admin());

NOTIFY pgrst, 'reload schema';
