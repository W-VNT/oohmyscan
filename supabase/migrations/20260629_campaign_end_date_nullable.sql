-- ============================================================================
-- Campagnes : date de fin optionnelle
-- ============================================================================
-- Permet aux campagnes "permanentes" / "en cours" / sans échéance définie
-- de ne pas avoir de date de fin obligatoire.
--
-- Affichage côté UI : "Du 01/06/2026 → en cours" si end_date est NULL.
-- ============================================================================

ALTER TABLE campaigns
  ALTER COLUMN end_date DROP NOT NULL;

COMMENT ON COLUMN campaigns.end_date IS 'Date de fin de diffusion (NULL = campagne en cours sans fin définie)';
