-- ============================================================================
-- Template email pour l'envoi automatique du contrat d'installation
-- ============================================================================
-- Comme pour les emails devis/facture, on stocke le sujet + le corps HTML
-- editables depuis Reglages > Email. Le corps utilise des variables :
--   {numero}         -> numero du contrat (ex: CONT-2026-001)
--   {gerant_prenom}  -> prenom du gerant
--   {gerant_nom}     -> nom du gerant
--   {etablissement}  -> nom de l'etablissement
--   {entreprise}     -> nom de l'entreprise (society)
-- ============================================================================

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS email_contract_subject TEXT,
  ADD COLUMN IF NOT EXISTS email_contract_body TEXT;

-- Defaults reasonnables pour ne pas se retrouver avec des champs vides
UPDATE company_settings
SET
  email_contract_subject = COALESCE(
    email_contract_subject,
    'Votre contrat d''installation {numero} — {entreprise}'
  ),
  email_contract_body = COALESCE(
    email_contract_body,
    '<p>Bonjour {gerant_prenom},</p><p>Suite à notre passage aujourd''hui, vous trouverez ci-joint votre <strong>contrat d''autorisation d''installation N° {numero}</strong>, signé électroniquement.</p><p>Ce document engage {entreprise} et {etablissement} pour la période convenue. Conservez-le précieusement, il vous servira de référence pour toute demande future.</p><p>Un grand merci pour votre confiance !</p><p>L''équipe {entreprise}</p>'
  )
WHERE email_contract_subject IS NULL OR email_contract_body IS NULL;

COMMENT ON COLUMN company_settings.email_contract_subject IS
  'Sujet email envoye au gerant en fin de signature contrat. Variables : {numero}, {gerant_prenom}, {gerant_nom}, {etablissement}, {entreprise}';
COMMENT ON COLUMN company_settings.email_contract_body IS
  'Corps HTML de l email contrat. Memes variables. Rich text edite dans Reglages > Email.';

-- Mettre a jour la vue company_public pour exposer les templates aux operateurs
CREATE OR REPLACE VIEW company_public
WITH (security_invoker = false)
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
  default_panel_type_id,
  email_contract_subject,
  email_contract_body
FROM company_settings;

GRANT SELECT ON company_public TO authenticated;
