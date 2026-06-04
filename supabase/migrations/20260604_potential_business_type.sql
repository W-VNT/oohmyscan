-- Migration: Add business_type to potential_requests
-- Permet de filtrer la recherche Google Places par typologie de commerce
-- independamment du support OOH MY AD propose

ALTER TABLE potential_requests
  ADD COLUMN IF NOT EXISTS business_type TEXT;

NOTIFY pgrst, 'reload schema';
