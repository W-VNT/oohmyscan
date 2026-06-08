-- ============================================================
-- DEMO REPORTING — Seed pour tester le rapport campagne
--
-- Cree :
--   - 1 client "Demo Reporting"
--   - 1 campagne "Demo Reporting Estival" (active)
--   - 18 panneaux repartis sur 3 regions (PACA, Occitanie, Bretagne/PdL)
--   - 6 lieux (campings demo)
--   - Tous les panneaux assignes a la campagne
--
-- A executer dans Supabase SQL Editor.
-- Idempotent : utilise ON CONFLICT DO NOTHING pour pouvoir relancer.
--
-- Apres :
--   1. Lancer le script `scripts/seed-demo-photos.mjs` pour uploader des photos
--   2. Aller dans /admin/campaigns/<id>/ et cliquer "Generer rapport campagne"
-- ============================================================

-- IDs deterministes pour pouvoir relancer / referencer
-- Client + campagne
DO $$
DECLARE
  v_client_id UUID := 'd0000000-0000-4000-8000-000000000001';
  v_campaign_id UUID := 'd0000000-0000-4000-8000-000000000002';
BEGIN
  -- ============================================================
  -- 1. CLIENT
  -- ============================================================
  INSERT INTO clients (id, company_name, contact_name, contact_email, contact_phone, address, postal_code, city, siret, is_active)
  VALUES (
    v_client_id,
    'Demo Reporting Client',
    'Jean Dupont',
    'jean@demoreporting.test',
    '01 23 45 67 89',
    '15 rue de la Demo',
    '75001',
    'Paris',
    '12345678900012',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 2. CAMPAGNE
  -- ============================================================
  INSERT INTO campaigns (id, name, client_id, description, start_date, end_date, status, target_panel_count)
  VALUES (
    v_campaign_id,
    'Demo Reporting Estival',
    v_client_id,
    'Campagne de demonstration pour tester le rapport',
    '2026-06-01',
    '2026-08-31',
    'active',
    18
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- ============================================================
-- 3. LIEUX (6 campings demo avec postal_code precis)
-- ============================================================
INSERT INTO locations (id, name, address, postal_code, city, phone, owner_first_name, owner_last_name, owner_role, owner_email, has_contract)
VALUES
  ('d1000000-0000-4000-8000-000000000001', 'Camping Les Pins',          '12 Avenue de la Mer',     '06160', 'Antibes',     '04 93 00 11 22', 'Marie',  'Martin',   'Gerant', 'marie@pins.test', true),
  ('d1000000-0000-4000-8000-000000000002', 'Camping La Plage',          '5 Boulevard Maritime',    '83000', 'Toulon',      '04 94 00 33 44', 'Paul',   'Bernard',  'Gerant', 'paul@plage.test', true),
  ('d1000000-0000-4000-8000-000000000003', 'Camping Le Languedoc',      '8 Route du Littoral',     '34280', 'La Grande-Motte', '04 67 00 55 66', 'Anne',   'Dubois',   'Gerant', 'anne@languedoc.test', true),
  ('d1000000-0000-4000-8000-000000000004', 'Camping Mediterranee',      '20 Chemin des Pins',      '66140', 'Canet-en-Roussillon', '04 68 00 77 88', 'Luc',    'Petit',    'Gerant', 'luc@medi.test', false),
  ('d1000000-0000-4000-8000-000000000005', 'Camping de la Baie',        '14 Route de la Cote',     '44500', 'La Baule',    '02 40 00 99 00', 'Sophie', 'Robert',   'Gerant', 'sophie@baie.test', true),
  ('d1000000-0000-4000-8000-000000000006', 'Camping Saint-Malo Plage',  '3 Boulevard de la Cote',  '35400', 'Saint-Malo',  '02 99 00 11 22', 'Eric',   'Moreau',   'Gerant', 'eric@stmalo.test', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. PANNEAUX (18 panneaux repartis sur 3 regions)
-- ============================================================
-- Pattern UUID : d2000000-XXXX-4000-8000-000000000NNN
-- XXXX = 0001-PACA / 0002-Occitanie / 0003-Bretagne-PdL

INSERT INTO panels (id, qr_code, reference, name, lat, lng, address, city, format, type, status, location_id, installed_at) VALUES
-- === PACA (7 panneaux, codes postaux 06/83/13) ===
('d2000000-0001-4000-8000-000000000001', 'd2000000-0001-4000-8000-000000000001', 'PACA-01', 'Nice - Promenade des Anglais', 43.6951, 7.2658, '12 Promenade des Anglais, 06000 Nice', 'Nice', '4x3', 'Bache', 'active', NULL, '2026-05-15'),
('d2000000-0001-4000-8000-000000000002', 'd2000000-0001-4000-8000-000000000002', 'PACA-02', 'Antibes - Camping Les Pins',   43.5803, 7.1252, '12 Avenue de la Mer, 06160 Antibes', 'Antibes', '2m2', 'Cadre', 'active', 'd1000000-0000-4000-8000-000000000001', '2026-05-16'),
('d2000000-0001-4000-8000-000000000003', 'd2000000-0001-4000-8000-000000000003', 'PACA-03', 'Cannes - Croisette',           43.5528, 7.0174, '15 Boulevard de la Croisette, 06400 Cannes', 'Cannes', '4x3', 'Bache', 'active', NULL, '2026-05-17'),
('d2000000-0001-4000-8000-000000000004', 'd2000000-0001-4000-8000-000000000004', 'PACA-04', 'Toulon - Camping La Plage',    43.1242, 5.9280, '5 Boulevard Maritime, 83000 Toulon', 'Toulon', '2m2', 'Cadre', 'active', 'd1000000-0000-4000-8000-000000000002', '2026-05-18'),
('d2000000-0001-4000-8000-000000000005', 'd2000000-0001-4000-8000-000000000005', 'PACA-05', 'Aix-en-Provence - Centre',     43.5263, 5.4454, '10 Cours Mirabeau, 13100 Aix-en-Provence', 'Aix-en-Provence', '4x3', 'Bache', 'active', NULL, '2026-05-19'),
('d2000000-0001-4000-8000-000000000006', 'd2000000-0001-4000-8000-000000000006', 'PACA-06', 'Marseille - Vieux Port',       43.2965, 5.3698, '20 Quai du Port, 13002 Marseille', 'Marseille', '4x3', 'Bache', 'active', NULL, '2026-05-20'),
('d2000000-0001-4000-8000-000000000007', 'd2000000-0001-4000-8000-000000000007', 'PACA-07', 'Hyeres - Plage',               43.1191, 6.1284, '8 Avenue de la Mediterranee, 83400 Hyeres', 'Hyeres', '2m2', 'Cadre', 'active', NULL, '2026-05-21'),

-- === Occitanie (6 panneaux, codes postaux 34/66/30/31/11) ===
('d2000000-0002-4000-8000-000000000001', 'd2000000-0002-4000-8000-000000000001', 'OCC-01', 'Montpellier - Comedie',          43.6109, 3.8763, '5 Place de la Comedie, 34000 Montpellier', 'Montpellier', '4x3', 'Bache', 'active', NULL, '2026-05-15'),
('d2000000-0002-4000-8000-000000000002', 'd2000000-0002-4000-8000-000000000002', 'OCC-02', 'La Grande-Motte - Camping',     43.5650, 4.0820, '8 Route du Littoral, 34280 La Grande-Motte', 'La Grande-Motte', '2m2', 'Cadre', 'active', 'd1000000-0000-4000-8000-000000000003', '2026-05-16'),
('d2000000-0002-4000-8000-000000000003', 'd2000000-0002-4000-8000-000000000003', 'OCC-03', 'Perpignan - Camping Medi',       42.6804, 3.0290, '20 Chemin des Pins, 66140 Canet-en-Roussillon', 'Canet-en-Roussillon', '2m2', 'Cadre', 'active', 'd1000000-0000-4000-8000-000000000004', '2026-05-17'),
('d2000000-0002-4000-8000-000000000004', 'd2000000-0002-4000-8000-000000000004', 'OCC-04', 'Toulouse - Capitole',            43.6047, 1.4442, '1 Place du Capitole, 31000 Toulouse', 'Toulouse', '4x3', 'Bache', 'active', NULL, '2026-05-18'),
('d2000000-0002-4000-8000-000000000005', 'd2000000-0002-4000-8000-000000000005', 'OCC-05', 'Beziers - Allees',              43.3442, 3.2196, '15 Allees Paul Riquet, 34500 Beziers', 'Beziers', '4x3', 'Bache', 'active', NULL, '2026-05-19'),
('d2000000-0002-4000-8000-000000000006', 'd2000000-0002-4000-8000-000000000006', 'OCC-06', 'Carcassonne - Cite',             43.2128, 2.3491, '5 Rue de la Cite, 11000 Carcassonne', 'Carcassonne', '2m2', 'Cadre', 'active', NULL, '2026-05-20'),

-- === Bretagne / Pays de la Loire (5 panneaux, codes postaux 44/35/56/29) ===
('d2000000-0003-4000-8000-000000000001', 'd2000000-0003-4000-8000-000000000001', 'BPL-01', 'La Baule - Camping de la Baie', 47.2865, -2.3940, '14 Route de la Cote, 44500 La Baule', 'La Baule', '2m2', 'Cadre', 'active', 'd1000000-0000-4000-8000-000000000005', '2026-05-15'),
('d2000000-0003-4000-8000-000000000002', 'd2000000-0003-4000-8000-000000000002', 'BPL-02', 'Nantes - Place Royale',         47.2173, -1.5536, '3 Place Royale, 44000 Nantes', 'Nantes', '4x3', 'Bache', 'active', NULL, '2026-05-16'),
('d2000000-0003-4000-8000-000000000003', 'd2000000-0003-4000-8000-000000000003', 'BPL-03', 'Saint-Malo - Camping Plage',   48.6493, -1.9856, '3 Boulevard de la Cote, 35400 Saint-Malo', 'Saint-Malo', '2m2', 'Cadre', 'active', 'd1000000-0000-4000-8000-000000000006', '2026-05-17'),
('d2000000-0003-4000-8000-000000000004', 'd2000000-0003-4000-8000-000000000004', 'BPL-04', 'Vannes - Port',                 47.6582, -2.7600, '10 Quai des Indes, 56000 Vannes', 'Vannes', '4x3', 'Bache', 'active', NULL, '2026-05-18'),
('d2000000-0003-4000-8000-000000000005', 'd2000000-0003-4000-8000-000000000005', 'BPL-05', 'Brest - Centre',                48.3905, -4.4860, '5 Rue de Siam, 29200 Brest', 'Brest', '4x3', 'Bache', 'active', NULL, '2026-05-19')

ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. ASSIGNATIONS panneaux <-> campagne
-- ============================================================
INSERT INTO panel_campaigns (panel_id, campaign_id, assigned_at)
SELECT id, 'd0000000-0000-4000-8000-000000000002'::uuid, NOW()
FROM panels
WHERE id::text LIKE 'd2000000-%'
ON CONFLICT DO NOTHING;

-- ============================================================
-- Verification
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM panels WHERE id::text LIKE 'd2000000-%')                                    AS panneaux_demo,
  (SELECT COUNT(*) FROM panel_campaigns WHERE campaign_id = 'd0000000-0000-4000-8000-000000000002') AS assignations,
  (SELECT COUNT(*) FROM locations WHERE id::text LIKE 'd1000000-%')                                 AS lieux_demo;
