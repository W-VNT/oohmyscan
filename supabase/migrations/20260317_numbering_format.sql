-- Migration: Update quote/invoice numbering format
-- Old: D-2026-001 (prefix-YYYY-NNN)
-- New: D-2603-0001 (prefix-YYMM-NNNN)

CREATE OR REPLACE FUNCTION get_next_quote_number()
RETURNS TEXT AS $$
DECLARE
  settings company_settings%ROWTYPE;
  num TEXT;
BEGIN
  SELECT * INTO settings FROM company_settings LIMIT 1 FOR UPDATE;
  num := settings.quote_prefix || '-' ||
         LPAD(EXTRACT(YEAR FROM NOW())::TEXT % 100 || '', 2, '0') ||
         LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0') || '-' ||
         LPAD(settings.next_quote_number::TEXT, 4, '0');
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
         LPAD(EXTRACT(YEAR FROM NOW())::TEXT % 100 || '', 2, '0') ||
         LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0') || '-' ||
         LPAD(settings.next_invoice_number::TEXT, 4, '0');
  UPDATE company_settings SET next_invoice_number = next_invoice_number + 1;
  RETURN num;
END;
$$ LANGUAGE plpgsql;
