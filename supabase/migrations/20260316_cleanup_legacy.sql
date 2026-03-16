-- 1. Drop legacy 'client' text column from campaigns (migrated to client_id FK)
ALTER TABLE campaigns DROP COLUMN IF EXISTS client;

-- 2. Add service_catalog_id FK to quote_lines for traceability
ALTER TABLE quote_lines ADD COLUMN IF NOT EXISTS service_catalog_id UUID REFERENCES service_catalog(id);

-- 3. Add service_catalog_id FK to invoice_lines for traceability
ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS service_catalog_id UUID REFERENCES service_catalog(id);

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
