-- ============================================================================
-- Systeme de notifications in-app
-- ============================================================================
-- Table notifications + trigger sur signalement panneau pour alerter les
-- admins. Realtime activé pour push instantané via Supabase channels.
--
-- Format standard :
--   type    : 'panel_report' | 'campaign_assigned' | ... (extensible)
--   title   : ex "Panneau signalé manquant"
--   body    : ex "Camping Les Pins — Entrée principale"
--   link    : deep-link ex '/admin/panels/xxx' pour naviguer au tap
--   metadata: jsonb pour payload contextuel (panel_id, campaign_id, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, read, created_at DESC);

COMMENT ON TABLE notifications IS
  'Notifications in-app par utilisateur. Realtime enabled pour push instantane.';

-- Enable realtime : les clients pourront s abonner aux changements
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur voit / modifie SES notifications
CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin voit tout (utile pour debug / vue d'ensemble)
CREATE POLICY "Admin full access notifications"
  ON notifications FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- Trigger : signalement panneau -> notif admins
-- ============================================================================
-- Se declenche quand le status d'un panneau passe de 'active' a 'missing'
-- ou 'maintenance'. Cree une notification pour chaque admin actif.
-- SECURITY DEFINER pour bypass RLS (le trigger tourne en tant que role db).
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_admins_panel_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  panel_name TEXT;
  location_name TEXT;
  status_label TEXT;
  admin_id UUID;
BEGIN
  -- Filtre : transition active -> problem uniquement
  IF NOT (OLD.status = 'active' AND NEW.status IN ('missing', 'maintenance')) THEN
    RETURN NEW;
  END IF;

  panel_name := COALESCE(NEW.name, NEW.reference, 'Panneau sans nom');
  SELECT l.name INTO location_name FROM locations l WHERE l.id = NEW.location_id;
  status_label := CASE NEW.status
    WHEN 'missing' THEN 'manquant'
    WHEN 'maintenance' THEN 'à revoir'
    ELSE NEW.status
  END;

  FOR admin_id IN
    SELECT id FROM profiles WHERE role = 'admin' AND is_active = true
  LOOP
    INSERT INTO notifications (user_id, type, title, body, link, metadata)
    VALUES (
      admin_id,
      'panel_report',
      'Panneau signalé ' || status_label,
      panel_name || COALESCE(' — ' || location_name, ''),
      '/admin/panels/' || NEW.id,
      jsonb_build_object(
        'panel_id', NEW.id,
        'location_id', NEW.location_id,
        'status', NEW.status,
        'previous_status', OLD.status
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_panel_status_change_notify_admins ON panels;

CREATE TRIGGER on_panel_status_change_notify_admins
  AFTER UPDATE OF status ON panels
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_admins_panel_report();

COMMENT ON FUNCTION notify_admins_panel_report IS
  'Cree une notification pour chaque admin actif quand un panneau est signale (status active -> missing/maintenance).';
