-- ============================================================================
-- Fix : ajout colonne sort_order sur campaign_visuals
--
-- Contexte : la colonne sort_order est utilisee par le code client depuis la
-- creation initiale des campagnes (INSERT + order by), mais n'a jamais ete
-- ajoutee via migration. Symptome : HTTP 400 "column campaign_visuals.
-- sort_order does not exist" sur toute lecture ou INSERT.
--
-- Fix : ADD COLUMN + backfill des rows existants avec un ordre naturel
-- (created_at ASC).
-- ============================================================================

ALTER TABLE campaign_visuals
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Backfill : ordonne les visuels existants par date de creation
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY campaign_id ORDER BY created_at) AS rn
  FROM campaign_visuals
  WHERE sort_order IS NULL
)
UPDATE campaign_visuals cv
SET sort_order = o.rn
FROM ordered o
WHERE cv.id = o.id;

-- Default 1 pour les futurs inserts sans valeur
ALTER TABLE campaign_visuals
  ALTER COLUMN sort_order SET DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_campaign_visuals_campaign_sort
  ON campaign_visuals(campaign_id, sort_order);

NOTIFY pgrst, 'reload schema';
