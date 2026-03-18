-- Update support_interest constraint for 5 families
ALTER TABLE contact_requests
  DROP CONSTRAINT IF EXISTS contact_requests_support_interest_check;

ALTER TABLE contact_requests
  ADD CONSTRAINT contact_requests_support_interest_check
  CHECK (support_interest IN (
    'diffusion-sur-mesure',
    'medias-tactiques',
    'reseaux-affichage',
    'animation-terrain',
    'digital',
    'multiple',
    'unknown',
    -- Legacy values (keep for existing data)
    'taxi',
    'sac-pain',
    'sac-pharma',
    'set-table',
    'sous-bock',
    'affiche-a3',
    'all'
  ));

NOTIFY pgrst, 'reload schema';
