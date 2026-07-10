-- ============================================================================
-- Backfill : profiles avec is_active=true mais status='invited'
--
-- Bug historique : la LoginPage mettait `is_active: true` apres set_password
-- mais oubliait `status: 'active'`. Consequence : des operateurs deja
-- fonctionnels (qui diffusent + installent) apparaissent avec le tag
-- "Invite" dans le back-office.
--
-- Fix client : LoginPage set maintenant les 2 champs.
-- Backfill : cette migration corrige les rows deja creees.
-- ============================================================================

UPDATE profiles
  SET status = 'active'
  WHERE is_active = TRUE AND status = 'invited';
