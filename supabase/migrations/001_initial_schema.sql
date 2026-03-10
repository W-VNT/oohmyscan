-- Utilisateurs (géré par Supabase Auth + table profile)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator')),
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Panneaux d'affichage
CREATE TABLE panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code TEXT UNIQUE NOT NULL,
  reference TEXT UNIQUE NOT NULL,
  name TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,
  city TEXT,
  format TEXT,
  type TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'vacant', 'missing', 'maintenance')),
  notes TEXT,
  installed_at TIMESTAMPTZ,
  installed_by UUID REFERENCES profiles(id),
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos des panneaux
CREATE TABLE panel_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID NOT NULL REFERENCES panels(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('installation', 'check', 'campaign', 'damage')),
  taken_by UUID REFERENCES profiles(id),
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Campagnes publicitaires
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignation campagne <-> panneau
CREATE TABLE panel_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID NOT NULL REFERENCES panels(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  unassigned_at TIMESTAMPTZ,
  validation_photo_path TEXT,
  validated_at TIMESTAMPTZ,
  notes TEXT
);

-- Index
CREATE INDEX ON panels(status);
CREATE INDEX ON panels(city);
CREATE INDEX ON panel_campaigns(panel_id);
CREATE INDEX ON panel_campaigns(campaign_id);
CREATE INDEX ON panel_campaigns(unassigned_at) WHERE unassigned_at IS NULL;

-- Row Level Security
ALTER TABLE panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies: tous les authentifiés peuvent lire
CREATE POLICY "Authenticated can read panels" ON panels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read campaigns" ON campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read panel_campaigns" ON panel_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read panel_photos" ON panel_photos FOR SELECT TO authenticated USING (true);

-- Policies: opérateurs peuvent insérer/modifier
CREATE POLICY "Operators can insert photos" ON panel_photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Operators can assign campaigns" ON panel_campaigns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Operators can update panels on scan" ON panels FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Policies: admins accès complet
CREATE POLICY "Admins full access panels" ON panels FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admins full access campaigns" ON campaigns FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admins full access panel_campaigns" ON panel_campaigns FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admins full access panel_photos" ON panel_photos FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admins full access profiles" ON profiles FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
