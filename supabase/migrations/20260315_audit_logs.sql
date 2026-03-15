-- =============================================================
-- Audit Logs — track sensitive admin actions
-- =============================================================

-- 1. Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries (by table, by actor, by date)
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 2. RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read audit_logs" ON audit_logs;
CREATE POLICY "Admin read audit_logs" ON audit_logs
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "System insert audit_logs" ON audit_logs;
CREATE POLICY "System insert audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- =============================================================
-- 3. Generic trigger function
-- =============================================================
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action TEXT;
  v_record_id UUID;
  v_old JSONB := NULL;
  v_new JSONB := NULL;
BEGIN
  -- Determine action label
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old := to_jsonb(OLD);
    v_record_id := OLD.id;
  END IF;

  INSERT INTO audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
  VALUES (auth.uid(), v_action, TG_TABLE_NAME, v_record_id, v_old, v_new);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================================
-- 4. Triggers on sensitive tables
-- =============================================================

-- profiles: log role changes only
DROP TRIGGER IF EXISTS audit_profiles_role_change ON profiles;
CREATE TRIGGER audit_profiles_role_change
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION audit_log_trigger();

-- company_settings: log all updates
DROP TRIGGER IF EXISTS audit_company_settings_update ON company_settings;
CREATE TRIGGER audit_company_settings_update
  AFTER UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_trigger();

-- clients: log creation and is_active changes
DROP TRIGGER IF EXISTS audit_clients_insert ON clients;
CREATE TRIGGER audit_clients_insert
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_trigger();

DROP TRIGGER IF EXISTS audit_clients_deactivation ON clients;
CREATE TRIGGER audit_clients_deactivation
  AFTER UPDATE ON clients
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION audit_log_trigger();

-- quotes: log status changes
DROP TRIGGER IF EXISTS audit_quotes_status ON quotes;
CREATE TRIGGER audit_quotes_status
  AFTER UPDATE ON quotes
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION audit_log_trigger();

-- invoices: log status changes
DROP TRIGGER IF EXISTS audit_invoices_status ON invoices;
CREATE TRIGGER audit_invoices_status
  AFTER UPDATE ON invoices
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION audit_log_trigger();
