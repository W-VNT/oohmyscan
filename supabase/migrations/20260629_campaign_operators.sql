-- ============================================================================
-- Assignation d'opérateurs aux campagnes
-- ============================================================================
-- Permet à l'admin de désigner explicitement quels opérateurs ont accès à
-- une campagne. Les opérateurs assignés voient la campagne dans leur app
-- même avant d'avoir posé un panneau.
--
-- Modèle simple : colonne UUID[] sur campaigns (KISS, équipe < 10 personnes).
-- Pour des équipes plus grosses ou besoins de RLS stricte, migrer vers une
-- table de jointure `campaign_operators(campaign_id, user_id, role, ...)`.
-- ============================================================================

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS operator_user_ids UUID[] NOT NULL DEFAULT '{}';

-- Index GIN pour les recherches "ARRAY contains user_id"
CREATE INDEX IF NOT EXISTS idx_campaigns_operator_user_ids
  ON campaigns USING GIN (operator_user_ids);

COMMENT ON COLUMN campaigns.operator_user_ids IS 'IDs des profils opérateurs ayant accès à la campagne (vide = personne assigné explicitement)';
