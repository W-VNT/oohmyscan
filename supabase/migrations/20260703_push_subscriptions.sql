-- ============================================================================
-- Push subscriptions Web Push (PWA)
-- ============================================================================
-- Chaque installation PWA (device + navigateur) stocke sa subscription :
--   endpoint  : URL du push server (Apple / Google / Mozilla)
--   p256dh    : cle publique pour encryption
--   auth      : secret pour signature
--
-- L'edge function send-push utilise ces valeurs (via web-push lib) pour
-- envoyer une notification systeme au device correspondant.
--
-- Note setup (voir README-push.md pour details):
--   1. Enable extension pg_net via Supabase Dashboard > Database > Extensions
--   2. Set secrets Supabase pour VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT
--   3. Configure Database Webhook : on INSERT notifications -> POST /functions/v1/send-push
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

COMMENT ON TABLE push_subscriptions IS
  'Web Push subscriptions par device. Consomme par edge function send-push.';

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subs"
  ON push_subscriptions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin full access push_subscriptions"
  ON push_subscriptions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
