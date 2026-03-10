-- ============================================================
-- OOHMYSCAN — Seed Data
-- Run this in Supabase SQL Editor after the initial migration.
-- ============================================================

-- User IDs (must match auth.users already created in Supabase)
-- admin@oohmyad.com  → 7ae41eac-38c1-4d27-b381-0d5ba9318b5f
-- operator@oohmyad.com → 5626b046-8a6d-403d-be77-da89877548d0

-- ============================================================
-- 1. PANELS — 15 panneaux répartis sur Paris / Lyon / Marseille
-- ============================================================

INSERT INTO panels (id, qr_code, reference, name, lat, lng, address, city, format, type, status, notes, installed_at, installed_by, last_checked_at) VALUES

-- Paris (6 panneaux)
('a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'PAR-001', 'Gare du Nord - Hall', 48.8809, 2.3553, '18 Rue de Dunkerque', 'Paris', '4x3', 'Mural', 'active', 'Face quai Eurostar', '2025-01-15T10:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', '2026-03-01T14:00:00Z'),

('a1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'PAR-002', 'Châtelet - Sortie 4', 48.8584, 2.3475, 'Place du Châtelet', 'Paris', 'Abribus', 'Totem', 'active', NULL, '2025-02-10T09:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', '2026-02-20T11:00:00Z'),

('a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', 'PAR-003', 'Opéra - Bd Haussmann', 48.8718, 2.3316, '25 Boulevard Haussmann', 'Paris', '8m²', 'Bâche', 'vacant', 'Contrat terminé fin février', '2025-03-01T10:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', '2026-02-28T16:00:00Z'),

('a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', 'PAR-004', 'République - Angle rue', 48.8674, 2.3639, '1 Place de la République', 'Paris', '4x3', 'Mural', 'maintenance', 'Vitre cassée signalée le 05/03', '2025-01-20T10:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', '2026-03-05T09:00:00Z'),

('a1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000005', 'PAR-005', 'Nation - Cours de Vincennes', 48.8485, 2.3960, '10 Cours de Vincennes', 'Paris', '2m²', 'Digital', 'active', 'Écran LED opérationnel', '2025-04-15T10:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', '2026-03-08T10:00:00Z'),

('a1000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000006', 'PAR-006', 'Montmartre - Rue Lepic', 48.8847, 2.3334, '45 Rue Lepic', 'Paris', 'Abribus', 'Déroulant', 'missing', 'Panneau introuvable lors du dernier passage', '2024-11-01T10:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', '2026-01-10T15:00:00Z'),

-- Lyon (5 panneaux)
('a1000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000007', 'LYO-001', 'Part-Dieu - Parvis gare', 45.7606, 4.8600, 'Parvis de la gare Part-Dieu', 'Lyon', '12m²', 'Bâche', 'active', 'Grand format côté tramway', '2025-02-01T10:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', '2026-03-07T14:00:00Z'),

('a1000000-0000-4000-8000-000000000008', 'a1000000-0000-4000-8000-000000000008', 'LYO-002', 'Bellecour - Rue Victor Hugo', 45.7578, 4.8320, '12 Rue Victor Hugo', 'Lyon', '4x3', 'Mural', 'active', NULL, '2025-03-10T10:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', '2026-03-06T11:00:00Z'),

('a1000000-0000-4000-8000-000000000009', 'a1000000-0000-4000-8000-000000000009', 'LYO-003', 'Confluence - Centre commercial', 45.7423, 4.8180, 'Centre Confluence', 'Lyon', '2m²', 'Totem', 'vacant', NULL, '2025-04-01T10:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', '2026-02-15T09:00:00Z'),

('a1000000-0000-4000-8000-000000000010', 'a1000000-0000-4000-8000-000000000010', 'LYO-004', 'Vieux Lyon - Rue St-Jean', 45.7625, 4.8275, '30 Rue Saint-Jean', 'Lyon', 'Abribus', 'Mural', 'active', 'Zone piétonne très fréquentée', '2025-01-05T10:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', '2026-03-09T16:00:00Z'),

('a1000000-0000-4000-8000-000000000011', 'a1000000-0000-4000-8000-000000000011', 'LYO-005', 'Croix-Rousse - Bd pentes', 45.7720, 4.8310, '5 Boulevard des Canuts', 'Lyon', '4x3', 'Déroulant', 'maintenance', 'Mécanisme bloqué', '2025-05-01T10:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', '2026-02-25T10:00:00Z'),

-- Marseille (4 panneaux)
('a1000000-0000-4000-8000-000000000012', 'a1000000-0000-4000-8000-000000000012', 'MRS-001', 'Vieux-Port - Quai des Belges', 43.2951, 5.3735, 'Quai des Belges', 'Marseille', '8m²', 'Bâche', 'active', 'Vue mer, très visible', '2025-01-10T10:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', '2026-03-08T13:00:00Z'),

('a1000000-0000-4000-8000-000000000013', 'a1000000-0000-4000-8000-000000000013', 'MRS-002', 'Canebière - Angle Noailles', 43.2960, 5.3780, '45 La Canebière', 'Marseille', '4x3', 'Mural', 'active', NULL, '2025-02-20T10:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', '2026-03-04T11:00:00Z'),

('a1000000-0000-4000-8000-000000000014', 'a1000000-0000-4000-8000-000000000014', 'MRS-003', 'Prado - Rond-point', 43.2765, 5.3890, 'Rond-Point du Prado', 'Marseille', '12m²', 'Totem', 'vacant', 'Disponible depuis janvier', '2025-03-15T10:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', '2026-01-20T15:00:00Z'),

('a1000000-0000-4000-8000-000000000015', 'a1000000-0000-4000-8000-000000000015', 'MRS-004', 'Joliette - Les Terrasses', 43.3065, 5.3655, 'Les Terrasses du Port', 'Marseille', '2m²', 'Digital', 'active', 'Écran interactif', '2025-04-10T10:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', '2026-03-09T10:00:00Z');


-- ============================================================
-- 2. CAMPAIGNS — 4 campagnes variées
-- ============================================================

INSERT INTO campaigns (id, name, client, description, start_date, end_date, status, created_by) VALUES

('c1000000-0000-4000-8000-000000000001', 'Lancement Parfum Éclat', 'Maison Dubois', 'Campagne nationale lancement parfum printemps 2026', '2026-03-01', '2026-04-30', 'active', '7ae41eac-38c1-4d27-b381-0d5ba9318b5f'),

('c1000000-0000-4000-8000-000000000002', 'Soldes Été 2026', 'Galeries Modernes', 'Affichage soldes été dans les grandes villes', '2026-06-25', '2026-07-31', 'draft', '7ae41eac-38c1-4d27-b381-0d5ba9318b5f'),

('c1000000-0000-4000-8000-000000000003', 'Festival Jazz Lyon', 'Ville de Lyon', 'Promotion festival jazz édition 2026', '2026-05-15', '2026-06-15', 'draft', '7ae41eac-38c1-4d27-b381-0d5ba9318b5f'),

('c1000000-0000-4000-8000-000000000004', 'Noël Enchanté 2025', 'Centre Commercial Rivoli', 'Campagne fêtes de fin d''année 2025', '2025-11-15', '2025-12-31', 'completed', '7ae41eac-38c1-4d27-b381-0d5ba9318b5f');


-- ============================================================
-- 3. PANEL_CAMPAIGNS — Assignations
-- ============================================================

INSERT INTO panel_campaigns (panel_id, campaign_id, assigned_at, assigned_by, validation_photo_path, validated_at, notes) VALUES

-- Campagne "Parfum Éclat" → 5 panneaux actifs
('a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', '2026-03-01T08:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', NULL, NULL, 'Posé le 1er mars'),
('a1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', '2026-03-01T09:30:00Z', '5626b046-8a6d-403d-be77-da89877548d0', NULL, NULL, NULL),
('a1000000-0000-4000-8000-000000000007', 'c1000000-0000-4000-8000-000000000001', '2026-03-02T10:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', NULL, NULL, 'Posé gare Part-Dieu'),
('a1000000-0000-4000-8000-000000000012', 'c1000000-0000-4000-8000-000000000001', '2026-03-03T11:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', NULL, NULL, NULL),
('a1000000-0000-4000-8000-000000000013', 'c1000000-0000-4000-8000-000000000001', '2026-03-03T14:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', NULL, NULL, NULL),

-- Campagne "Noël Enchanté" (terminée) → 3 panneaux, désassignés
('a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000004', '2025-11-15T08:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', NULL, NULL, 'Campagne Noël'),
('a1000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000004', '2025-11-16T09:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', NULL, NULL, NULL),
('a1000000-0000-4000-8000-000000000008', 'c1000000-0000-4000-8000-000000000004', '2025-11-17T10:00:00Z', '5626b046-8a6d-403d-be77-da89877548d0', NULL, NULL, NULL);


-- ============================================================
-- 4. PANEL_PHOTOS — Quelques photos simulées
-- ============================================================

INSERT INTO panel_photos (panel_id, storage_path, photo_type, taken_by, taken_at, notes) VALUES

-- Installation photos
('a1000000-0000-4000-8000-000000000001', 'panels/PAR-001/install_2025-01-15.jpg', 'installation', '5626b046-8a6d-403d-be77-da89877548d0', '2025-01-15T10:05:00Z', 'Installation initiale Gare du Nord'),
('a1000000-0000-4000-8000-000000000007', 'panels/LYO-001/install_2025-02-01.jpg', 'installation', '5626b046-8a6d-403d-be77-da89877548d0', '2025-02-01T10:10:00Z', 'Pose bâche 12m² Part-Dieu'),
('a1000000-0000-4000-8000-000000000012', 'panels/MRS-001/install_2025-01-10.jpg', 'installation', '5626b046-8a6d-403d-be77-da89877548d0', '2025-01-10T10:15:00Z', NULL),

-- Check photos
('a1000000-0000-4000-8000-000000000001', 'panels/PAR-001/check_2026-03-01.jpg', 'check', '5626b046-8a6d-403d-be77-da89877548d0', '2026-03-01T14:05:00Z', 'RAS, bon état'),
('a1000000-0000-4000-8000-000000000002', 'panels/PAR-002/check_2026-02-20.jpg', 'check', '5626b046-8a6d-403d-be77-da89877548d0', '2026-02-20T11:10:00Z', NULL),
('a1000000-0000-4000-8000-000000000008', 'panels/LYO-002/check_2026-03-06.jpg', 'check', '5626b046-8a6d-403d-be77-da89877548d0', '2026-03-06T11:05:00Z', 'Affiche légèrement décollée en bas'),
('a1000000-0000-4000-8000-000000000010', 'panels/LYO-004/check_2026-03-09.jpg', 'check', '5626b046-8a6d-403d-be77-da89877548d0', '2026-03-09T16:10:00Z', NULL),

-- Campaign photos
('a1000000-0000-4000-8000-000000000001', 'panels/PAR-001/campaign_eclat_2026-03-01.jpg', 'campaign', '5626b046-8a6d-403d-be77-da89877548d0', '2026-03-01T08:15:00Z', 'Pose campagne Parfum Éclat'),
('a1000000-0000-4000-8000-000000000007', 'panels/LYO-001/campaign_eclat_2026-03-02.jpg', 'campaign', '5626b046-8a6d-403d-be77-da89877548d0', '2026-03-02T10:15:00Z', 'Pose campagne Parfum Éclat Lyon'),

-- Damage photo
('a1000000-0000-4000-8000-000000000004', 'panels/PAR-004/damage_2026-03-05.jpg', 'damage', '5626b046-8a6d-403d-be77-da89877548d0', '2026-03-05T09:10:00Z', 'Vitre fissurée coin supérieur droit');
