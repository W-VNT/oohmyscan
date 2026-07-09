-- ============================================================================
-- Fix : is_admin() doit rester callable par anon
--
-- Contexte : le security hardening v3 (20260707_security_hardening_v3.sql)
-- a fait REVOKE EXECUTE ... FROM PUBLIC + GRANT anon absent. Consequence :
-- les policies RLS "Admin full access ..." qui appellent is_admin() cassent
-- pour toute session anon ou toute session authentifiee dont le JWT vient
-- d'expirer (fallback auto sur anon).
--
-- Symptomes : HTTP 400/401 aleatoires avec "permission denied for function
-- is_admin" sur campaigns, campaign_visuals, panel_formats, etc.
--
-- Sécurité maintenue : is_admin() est SECURITY DEFINER et fait juste
-- "SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role =
-- 'admin')". Pour anon, auth.uid() est NULL -> aucun match -> renvoie
-- FALSE. Aucune donnee ne fuite.
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

NOTIFY pgrst, 'reload schema';
