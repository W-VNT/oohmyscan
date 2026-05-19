-- Add commercial_id to clients, quotes, and invoices to track which admin
-- is the assigned commercial contact for the client / document.
-- ON DELETE SET NULL so that deactivating an admin doesn't break documents.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS commercial_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS commercial_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS commercial_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_commercial_id ON clients(commercial_id);
CREATE INDEX IF NOT EXISTS idx_quotes_commercial_id ON quotes(commercial_id);
CREATE INDEX IF NOT EXISTS idx_invoices_commercial_id ON invoices(commercial_id);
