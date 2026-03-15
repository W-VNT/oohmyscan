-- =============================================
-- Transactional line save RPC functions
-- Wraps delete + insert + update totals in a single transaction
-- =============================================

-- save_quote_lines: atomic replacement of all lines for a quote
CREATE OR REPLACE FUNCTION save_quote_lines(
  p_quote_id UUID,
  p_lines JSONB,
  p_total_ht DECIMAL,
  p_total_tva DECIMAL,
  p_total_ttc DECIMAL
) RETURNS VOID AS $$
BEGIN
  -- Security: only admins can call this
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  -- 1. Delete existing lines
  DELETE FROM quote_lines WHERE quote_id = p_quote_id;

  -- 2. Insert new lines (if any)
  IF jsonb_array_length(COALESCE(p_lines, '[]'::JSONB)) > 0 THEN
    INSERT INTO quote_lines (quote_id, description, quantity, unit, unit_price, tva_rate, total_ht, sort_order)
    SELECT
      p_quote_id,
      (line->>'description')::TEXT,
      (line->>'quantity')::DECIMAL,
      COALESCE((line->>'unit')::TEXT, 'unité'),
      (line->>'unit_price')::DECIMAL,
      (line->>'tva_rate')::DECIMAL,
      (line->>'total_ht')::DECIMAL,
      (line->>'sort_order')::INTEGER
    FROM jsonb_array_elements(p_lines) AS line;
  END IF;

  -- 3. Update quote totals
  UPDATE quotes
  SET total_ht = p_total_ht,
      total_tva = p_total_tva,
      total_ttc = p_total_ttc,
      updated_at = NOW()
  WHERE id = p_quote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- save_invoice_lines: atomic replacement of all lines for an invoice
CREATE OR REPLACE FUNCTION save_invoice_lines(
  p_invoice_id UUID,
  p_lines JSONB,
  p_total_ht DECIMAL,
  p_total_tva DECIMAL,
  p_total_ttc DECIMAL
) RETURNS VOID AS $$
BEGIN
  -- Security: only admins can call this
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  -- 1. Delete existing lines
  DELETE FROM invoice_lines WHERE invoice_id = p_invoice_id;

  -- 2. Insert new lines (if any)
  IF jsonb_array_length(COALESCE(p_lines, '[]'::JSONB)) > 0 THEN
    INSERT INTO invoice_lines (invoice_id, description, quantity, unit, unit_price, tva_rate, total_ht, sort_order)
    SELECT
      p_invoice_id,
      (line->>'description')::TEXT,
      (line->>'quantity')::DECIMAL,
      COALESCE((line->>'unit')::TEXT, 'unité'),
      (line->>'unit_price')::DECIMAL,
      (line->>'tva_rate')::DECIMAL,
      (line->>'total_ht')::DECIMAL,
      (line->>'sort_order')::INTEGER
    FROM jsonb_array_elements(p_lines) AS line;
  END IF;

  -- 3. Update invoice totals
  UPDATE invoices
  SET total_ht = p_total_ht,
      total_tva = p_total_tva,
      total_ttc = p_total_ttc,
      updated_at = NOW()
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
