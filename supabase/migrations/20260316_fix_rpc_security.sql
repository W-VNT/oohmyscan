-- Fix RPC functions: add SECURITY DEFINER so they can access company_settings through RLS
-- Also add cancelled to quotes status CHECK constraint (aligned with TypeScript types)

-- 1. Recreate get_next_quote_number with SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_next_quote_number()
RETURNS TEXT AS $$
DECLARE
  settings company_settings%ROWTYPE;
  num TEXT;
BEGIN
  SELECT * INTO settings FROM company_settings LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'company_settings is empty — please configure company settings first';
  END IF;
  num := settings.quote_prefix || '-' ||
         EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
         LPAD(settings.next_quote_number::TEXT, 3, '0');
  UPDATE company_settings SET next_quote_number = next_quote_number + 1;
  RETURN num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recreate get_next_invoice_number with SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
  settings company_settings%ROWTYPE;
  num TEXT;
BEGIN
  SELECT * INTO settings FROM company_settings LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'company_settings is empty — please configure company settings first';
  END IF;
  num := settings.invoice_prefix || '-' ||
         EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
         LPAD(settings.next_invoice_number::TEXT, 3, '0');
  UPDATE company_settings SET next_invoice_number = next_invoice_number + 1;
  RETURN num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update quotes status CHECK to include both 'converted' and 'cancelled'
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check
  CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'converted', 'cancelled'));

-- 4. Add missing issued_at column to quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS issued_at DATE DEFAULT CURRENT_DATE;

-- 5. Add missing issued_at column to invoices (same pattern)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS issued_at DATE DEFAULT CURRENT_DATE;

-- 6. Ensure company_settings has at least one row
INSERT INTO company_settings (company_name, quote_prefix, invoice_prefix)
SELECT 'OOHMYAD', 'D', 'F'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

-- 7. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
