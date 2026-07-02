-- ============================================================================
-- Vue publique des parametres entreprise pour les operateurs
-- ============================================================================
-- Contexte : le PDF contrat (genere cote client dans l'app operateur) a
-- besoin des infos entreprise (nom, adresse, SIRET, tel, email, logo).
-- Or company_settings a une RLS admin-only et contient aussi des donnees
-- sensibles (IBAN, BIC, resend_api_key) qu'on ne veut PAS exposer aux
-- operateurs.
--
-- Solution : une vue exposant uniquement les champs "publics" necessaires
-- au PDF, accessible en lecture par tout utilisateur authentifie.
-- ============================================================================

CREATE OR REPLACE VIEW company_public
WITH (security_invoker = false)  -- Vue en SECURITY DEFINER : bypass RLS sur company_settings
AS
SELECT
  id,
  company_name,
  address,
  city,
  postal_code,
  siret,
  tva_number,
  phone,
  email,
  logo_path,
  legal_mentions,
  late_penalty_text,
  default_panel_type_id
FROM company_settings;

GRANT SELECT ON company_public TO authenticated;

COMMENT ON VIEW company_public IS
  'Vue lecture seule des parametres entreprise, expose les champs necessaires au PDF contrat pour les operateurs (nom, adresse, SIRET, coordonnees, logo, mentions). Exclut les donnees financieres et cles API.';
