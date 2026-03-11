-- Migration: Admin Back-Office — Phase 1
-- Nouvelles tables: clients, panel_formats, service_catalog, campaign_visuals,
-- quotes, quote_lines, invoices, invoice_lines, qr_stock, company_settings
-- + enrichissement campaigns + trigger campagne terminée + RLS

-- =============================================
-- 0. HELPER FUNCTION — is_admin()
-- =============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================
-- 1. PANEL_FORMATS (formats dynamiques)
-- =============================================
CREATE TABLE panel_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  width_cm INT,
  height_cm INT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO panel_formats (name) VALUES
  ('4x3'), ('Abribus'), ('Bâche'), ('Mupi'), ('Totem'), ('Digital'),
  ('2m²'), ('8m²'), ('12m²');

-- =============================================
-- 2. CLIENTS
-- =============================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  siret TEXT,
  tva_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. CAMPAIGNS — enrichir
-- =============================================
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id),
  ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS target_panel_count INT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Migration champ texte client → FK sera faite séparément (Phase 3)

-- =============================================
-- 4. CAMPAIGN_VISUALS
-- =============================================
CREATE TABLE campaign_visuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  panel_format_id UUID REFERENCES panel_formats(id),
  storage_path TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. SERVICE_CATALOG
-- =============================================
CREATE TABLE service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  default_unit_price DECIMAL(10,2) DEFAULT 0,
  default_tva_rate DECIMAL(5,2) DEFAULT 20.00,
  unit TEXT DEFAULT 'unité',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO service_catalog (name, default_unit_price, default_tva_rate, unit, sort_order) VALUES
  ('Location emplacement', 0, 20.00, 'mois', 1),
  ('Pose d''affiche', 0, 20.00, 'unité', 2),
  ('Dépose affiche', 0, 20.00, 'unité', 3),
  ('Création visuelle', 0, 20.00, 'forfait', 4),
  ('Tirage impression', 0, 20.00, 'm²', 5),
  ('Frais de déplacement', 0, 20.00, 'forfait', 6);

-- =============================================
-- 6. QUOTES (devis)
-- =============================================
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id),
  campaign_id UUID REFERENCES campaigns(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'converted')),
  total_ht DECIMAL(10,2) DEFAULT 0,
  total_ttc DECIMAL(10,2) DEFAULT 0,
  valid_until DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 7. QUOTE_LINES
-- =============================================
CREATE TABLE quote_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  service_catalog_id UUID REFERENCES service_catalog(id),
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'unité',
  unit_price DECIMAL(10,2) DEFAULT 0,
  tva_rate DECIMAL(5,2) DEFAULT 20.00,
  total_ht DECIMAL(10,2) DEFAULT 0,
  sort_order INT DEFAULT 0
);

-- =============================================
-- 8. INVOICES (factures)
-- =============================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  quote_id UUID REFERENCES quotes(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  campaign_id UUID REFERENCES campaigns(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  total_ht DECIMAL(10,2) DEFAULT 0,
  total_ttc DECIMAL(10,2) DEFAULT 0,
  issued_at DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_at DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 9. INVOICE_LINES
-- =============================================
CREATE TABLE invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  service_catalog_id UUID REFERENCES service_catalog(id),
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'unité',
  unit_price DECIMAL(10,2) DEFAULT 0,
  tva_rate DECIMAL(5,2) DEFAULT 20.00,
  total_ht DECIMAL(10,2) DEFAULT 0,
  sort_order INT DEFAULT 0
);

-- =============================================
-- 10. QR_STOCK
-- =============================================
CREATE TABLE qr_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'printed', 'assigned')),
  batch_name TEXT,
  assigned_panel_id UUID REFERENCES panels(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 11. COMPANY_SETTINGS (singleton)
-- =============================================
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT DEFAULT 'OOHMYAD',
  address TEXT,
  city TEXT,
  postal_code TEXT,
  siret TEXT,
  tva_number TEXT,
  logo_path TEXT,
  email TEXT,
  phone TEXT,
  iban TEXT,
  bic TEXT,
  quote_prefix TEXT DEFAULT 'D',
  invoice_prefix TEXT DEFAULT 'F',
  next_quote_number INT DEFAULT 1,
  next_invoice_number INT DEFAULT 1,
  legal_mentions TEXT DEFAULT 'TVA non applicable, article 293 B du CGI'
);

INSERT INTO company_settings DEFAULT VALUES;

-- =============================================
-- 12. NUMÉROTATION ATOMIQUE
-- =============================================
CREATE OR REPLACE FUNCTION get_next_quote_number()
RETURNS TEXT AS $$
DECLARE
  settings company_settings%ROWTYPE;
  num TEXT;
BEGIN
  SELECT * INTO settings FROM company_settings LIMIT 1 FOR UPDATE;
  num := settings.quote_prefix || '-' ||
         EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
         LPAD(settings.next_quote_number::TEXT, 3, '0');
  UPDATE company_settings SET next_quote_number = next_quote_number + 1;
  RETURN num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
  settings company_settings%ROWTYPE;
  num TEXT;
BEGIN
  SELECT * INTO settings FROM company_settings LIMIT 1 FOR UPDATE;
  num := settings.invoice_prefix || '-' ||
         EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
         LPAD(settings.next_invoice_number::TEXT, 3, '0');
  UPDATE company_settings SET next_invoice_number = next_invoice_number + 1;
  RETURN num;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 13. TRIGGER — campagne terminée → panneaux vacant
-- =============================================
CREATE OR REPLACE FUNCTION auto_vacate_panels_on_campaign_end()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE panel_campaigns
    SET unassigned_at = NOW()
    WHERE campaign_id = NEW.id AND unassigned_at IS NULL;

    UPDATE panels
    SET status = 'vacant'
    WHERE id IN (
      SELECT panel_id FROM panel_campaigns
      WHERE campaign_id = NEW.id
    )
    AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_campaign_completed
  AFTER UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION auto_vacate_panels_on_campaign_end();

-- =============================================
-- 14. RLS — nouvelles tables
-- =============================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_visuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Admin : accès total sur toutes les tables business
CREATE POLICY "Admin full access clients" ON clients FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access panel_formats" ON panel_formats FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access service_catalog" ON service_catalog FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access campaign_visuals" ON campaign_visuals FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access quotes" ON quotes FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access quote_lines" ON quote_lines FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access invoices" ON invoices FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access invoice_lines" ON invoice_lines FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access qr_stock" ON qr_stock FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access company_settings" ON company_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Opérateurs : lecture sur les référentiels nécessaires au terrain
CREATE POLICY "Authenticated read panel_formats" ON panel_formats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read campaign_visuals" ON campaign_visuals FOR SELECT TO authenticated USING (true);
