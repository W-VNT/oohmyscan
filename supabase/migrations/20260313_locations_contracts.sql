-- ============================================================
-- Migration: Locations + Contracts + Amendments (IDEMPOTENT)
-- Refactoring: 1 lieu → N panneaux, 1 lieu → 1 contrat → N avenants
-- ============================================================

-- 1. Table locations (établissements)
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Infos établissement
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT,

  -- Représentant / bailleur
  owner_last_name TEXT NOT NULL,
  owner_first_name TEXT NOT NULL,
  owner_role TEXT NOT NULL DEFAULT 'Gérant',
  owner_email TEXT,
  closing_months TEXT,

  -- Statut
  has_contract BOOLEAN DEFAULT FALSE,
  contract_signed_at TIMESTAMPTZ,

  -- Métadonnées
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_city ON locations(city);
CREATE INDEX IF NOT EXISTS idx_locations_has_contract ON locations(has_contract);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_locations_address ON locations USING gin (address gin_trgm_ops);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- RLS policies (DROP IF EXISTS then recreate)
DROP POLICY IF EXISTS "Admin full access locations" ON locations;
CREATE POLICY "Admin full access locations" ON locations
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Operator read locations" ON locations;
CREATE POLICY "Operator read locations" ON locations
  FOR SELECT TO authenticated
  USING (true);

-- 2. Panels: ajout location_id + zone_label
ALTER TABLE panels ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE panels ADD COLUMN IF NOT EXISTS zone_label TEXT;

CREATE INDEX IF NOT EXISTS idx_panels_location_id ON panels(location_id);

-- 3. Table panel_contracts (lié au lieu, pas au panneau)
CREATE TABLE IF NOT EXISTS panel_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lien vers le LIEU
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  -- Numérotation
  contract_number TEXT UNIQUE NOT NULL,

  -- Snapshot des infos au moment de la signature
  establishment_name TEXT NOT NULL,
  establishment_address TEXT NOT NULL,
  establishment_postal_code TEXT NOT NULL,
  establishment_city TEXT NOT NULL,
  establishment_phone TEXT,
  owner_last_name TEXT NOT NULL,
  owner_first_name TEXT NOT NULL,
  owner_role TEXT NOT NULL,
  owner_email TEXT,
  closing_months TEXT,

  -- Panneaux couverts au moment de la signature (snapshot JSON)
  panels_snapshot JSONB NOT NULL DEFAULT '[]',

  -- Signatures (storage paths, not inline data)
  signature_owner TEXT NOT NULL,
  signature_operator TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL,
  signed_city TEXT,

  -- Stockage
  storage_path TEXT,
  status TEXT DEFAULT 'signed'
    CHECK (status IN ('signed', 'amended', 'terminated')),

  -- Compteur avenants
  next_amendment_number INT DEFAULT 1,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add updated_at if table existed without it
ALTER TABLE panel_contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_panel_contracts_location_id ON panel_contracts(location_id);

ALTER TABLE panel_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access contracts" ON panel_contracts;
CREATE POLICY "Admin full access contracts" ON panel_contracts
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Operator read contracts" ON panel_contracts;
CREATE POLICY "Operator read contracts" ON panel_contracts
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Operator insert contracts" ON panel_contracts;
CREATE POLICY "Operator insert contracts" ON panel_contracts
  FOR INSERT TO authenticated
  WITH CHECK (NOT is_admin());

-- 4. Table contract_amendments (avenants)
CREATE TABLE IF NOT EXISTS contract_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  contract_id UUID NOT NULL REFERENCES panel_contracts(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id),

  -- Numérotation avenant
  amendment_number TEXT UNIQUE NOT NULL,

  -- Raison de l'avenant
  reason TEXT NOT NULL
    CHECK (reason IN ('panel_added', 'panel_removed', 'terms_updated')),

  -- Panneaux ajoutés / retirés
  panels_added JSONB DEFAULT '[]',
  panels_removed JSONB DEFAULT '[]',

  -- Snapshot complet APRÈS l'avenant
  panels_snapshot JSONB NOT NULL DEFAULT '[]',

  -- Signatures (storage paths, not inline data)
  signature_owner TEXT NOT NULL,
  signature_operator TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL,
  signed_city TEXT,

  storage_path TEXT,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_amendments_contract_id ON contract_amendments(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_amendments_location_id ON contract_amendments(location_id);

ALTER TABLE contract_amendments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access amendments" ON contract_amendments;
CREATE POLICY "Admin full access amendments" ON contract_amendments
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Operator read amendments" ON contract_amendments;
CREATE POLICY "Operator read amendments" ON contract_amendments
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Operator insert amendments" ON contract_amendments;
CREATE POLICY "Operator insert amendments" ON contract_amendments
  FOR INSERT TO authenticated
  WITH CHECK (NOT is_admin());

-- 5. Fonction numérotation avenant (atomique)
CREATE OR REPLACE FUNCTION get_next_amendment_number(p_contract_id UUID)
RETURNS TEXT AS $$
DECLARE
  contract panel_contracts%ROWTYPE;
  num TEXT;
BEGIN
  SELECT * INTO contract FROM panel_contracts
    WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract % not found', p_contract_id;
  END IF;
  num := contract.contract_number || '-A' ||
         contract.next_amendment_number::TEXT;
  UPDATE panel_contracts
    SET next_amendment_number = next_amendment_number + 1
    WHERE id = p_contract_id;
  RETURN num;
END;
$$ LANGUAGE plpgsql;

-- 6. Fonction numérotation contrat (atomique, évite les race conditions)
CREATE OR REPLACE FUNCTION get_next_contract_number()
RETURNS TEXT AS $$
DECLARE
  year_str TEXT;
  cnt INT;
  num TEXT;
BEGIN
  year_str := EXTRACT(YEAR FROM NOW())::TEXT;
  -- Lock the table to prevent concurrent inserts from getting the same number
  LOCK TABLE panel_contracts IN SHARE ROW EXCLUSIVE MODE;
  SELECT COUNT(*) INTO cnt FROM panel_contracts
    WHERE contract_number LIKE 'CONT-' || year_str || '-%';
  num := 'CONT-' || year_str || '-' || LPAD((cnt + 1)::TEXT, 3, '0');
  RETURN num;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger: sync has_contract on locations when contract is inserted/deleted
CREATE OR REPLACE FUNCTION sync_location_has_contract()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE locations
      SET has_contract = TRUE, contract_signed_at = NEW.signed_at, updated_at = NOW()
      WHERE id = NEW.location_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE locations
      SET has_contract = EXISTS(
        SELECT 1 FROM panel_contracts WHERE location_id = OLD.location_id AND id != OLD.id
      ),
      contract_signed_at = CASE
        WHEN NOT EXISTS(SELECT 1 FROM panel_contracts WHERE location_id = OLD.location_id AND id != OLD.id)
        THEN NULL
        ELSE contract_signed_at
      END,
      updated_at = NOW()
      WHERE id = OLD.location_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_location_has_contract ON panel_contracts;
CREATE TRIGGER trg_sync_location_has_contract
  AFTER INSERT OR DELETE ON panel_contracts
  FOR EACH ROW EXECUTE FUNCTION sync_location_has_contract();

-- 8. Vue panneaux orphelins (sans lieu)
CREATE OR REPLACE VIEW panels_without_location AS
  SELECT * FROM panels WHERE location_id IS NULL;
