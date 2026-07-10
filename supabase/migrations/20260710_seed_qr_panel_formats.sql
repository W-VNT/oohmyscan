-- ============================================================================
-- Seed des formats panneau QR classiques
--
-- Contexte : la migration 003_admin_backoffice.sql etait censee seed les
-- formats (4x3, Abribus, Bache, Mupi, Totem, Digital) mais chez ce projet
-- ils n'ont jamais ete inseres. Consequence : impossible de creer une
-- campagne avec workflow QR car le dropdown "Format de support" ne
-- propose que Sous-bock / Set de table / Panneau libre (tous sans QR).
--
-- Fix : INSERT idempotent des formats QR standards. has_qr_code=true,
-- workflow_type='qr'.
-- ============================================================================

INSERT INTO panel_formats (name, has_qr_code, workflow_type, is_active, width_cm, height_cm)
VALUES
  ('4x3',      true, 'qr', true, 400, 300),
  ('Abribus',  true, 'qr', true, 175, 118),
  ('Mupi',     true, 'qr', true, 118, 175),
  ('Totem',    true, 'qr', true, 100, 200),
  ('Bâche',    true, 'qr', true, null, null),
  ('Digital',  true, 'qr', true, null, null)
ON CONFLICT (name) DO UPDATE SET
  has_qr_code = EXCLUDED.has_qr_code,
  workflow_type = EXCLUDED.workflow_type,
  is_active = EXCLUDED.is_active;

NOTIFY pgrst, 'reload schema';
