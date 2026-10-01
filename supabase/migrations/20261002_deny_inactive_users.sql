-- ============================================================================
-- Comptes desactives : coupure immediate de l'acces aux donnees
--
-- Un utilisateur desactive (profiles.is_active = false) garde un JWT valide
-- jusqu'a son expiration (~1 h) : le bannir dans Auth (fait par l'edge
-- function manage-user) empeche la reconnexion et le refresh, mais pas
-- l'usage du jeton deja emis. Cette policy RESTRICTIVE lui refuse tout
-- acces des la desactivation, quel que soit son jeton.
--
-- Appliquee automatiquement a TOUTES les tables RLS du schema public (pas de
-- liste a maintenir) + storage.objects. Exception : il peut lire son propre
-- profil, pour que l'app detecte la desactivation et le deconnecte.
-- IDEMPOTENT.
-- ============================================================================

-- Garde-fou : ne pas s'enfermer dehors
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin' AND is_active IS NOT FALSE) THEN
    RAISE EXCEPTION 'Aucun admin actif : migration annulee.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active IS NOT FALSE);
$$;

GRANT EXECUTE ON FUNCTION public.is_active_user() TO anon, authenticated;

-- Toutes les tables RLS (sauf profiles, traitee a part)
-- (SELECT ...) : evaluee une seule fois par requete, pas par ligne.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity AND tablename <> 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Deny inactive users" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Deny inactive users" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
      'USING ((SELECT public.is_active_user())) WITH CHECK ((SELECT public.is_active_user()))', t);
  END LOOP;
END $$;

-- Profils : un compte desactive ne lit que le sien et ne modifie rien
DROP POLICY IF EXISTS "Deny inactive users" ON public.profiles;
CREATE POLICY "Deny inactive users" ON public.profiles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT public.is_active_user()) OR id = auth.uid())
  WITH CHECK ((SELECT public.is_active_user()));

-- Fichiers
DROP POLICY IF EXISTS "Deny inactive users" ON storage.objects;
CREATE POLICY "Deny inactive users" ON storage.objects
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT public.is_active_user()))
  WITH CHECK ((SELECT public.is_active_user()));

-- Verification : nombre de tables couvertes
SELECT count(*) AS tables_protegees
FROM pg_policies
WHERE policyname = 'Deny inactive users';
