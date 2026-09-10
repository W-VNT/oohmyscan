-- ============================================================================
-- Fix save_quote_lines / save_invoice_lines : persister discount + meta
--
-- Bug : ces RPCs n'inseraient que 7 champs (description, quantity, unit,
-- unit_price, tva_rate, total_ht, sort_order). Les colonnes existantes
-- discount_type, discount_value (mig 20260318_line_discounts) et line_type
-- (mig 20260318_line_sections) + service_catalog_id (initial) etaient
-- ignorees a chaque save -> la remise etait calculee dans total_ht mais
-- perdue en meta -> apres un reload la remise disparaissait de l'UI.
--
-- Fix : re-create les 2 RPC pour lire ces champs depuis le JSONB envoye
-- par le client.
--
-- Preserve : SECURITY DEFINER, is_admin() check, search_path fige,
-- meme signature (les arguments RPC ne changent pas, juste le corps).
-- ============================================================================

CREATE OR REPLACE FUNCTION save_quote_lines(
  p_quote_id UUID,
  p_lines JSONB,
  p_total_ht DECIMAL,
  p_total_tva DECIMAL,
  p_total_ttc DECIMAL
) RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  DELETE FROM quote_lines WHERE quote_id = p_quote_id;

  IF jsonb_array_length(COALESCE(p_lines, '[]'::JSONB)) > 0 THEN
    INSERT INTO quote_lines (
      quote_id, description, quantity, unit, unit_price, tva_rate,
      total_ht, sort_order,
      discount_type, discount_value, line_type, service_catalog_id
    )
    SELECT
      p_quote_id,
      (line->>'description')::TEXT,
      (line->>'quantity')::DECIMAL,
      COALESCE((line->>'unit')::TEXT, 'unité'),
      (line->>'unit_price')::DECIMAL,
      (line->>'tva_rate')::DECIMAL,
      (line->>'total_ht')::DECIMAL,
      (line->>'sort_order')::INTEGER,
      NULLIF(line->>'discount_type', '')::TEXT,
      COALESCE((line->>'discount_value')::DECIMAL, 0),
      COALESCE((line->>'line_type')::TEXT, 'item'),
      NULLIF(line->>'service_catalog_id', '')::UUID
    FROM jsonb_array_elements(p_lines) AS line;
  END IF;

  UPDATE quotes
  SET total_ht = p_total_ht,
      total_tva = p_total_tva,
      total_ttc = p_total_ttc,
      updated_at = NOW()
  WHERE id = p_quote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION save_invoice_lines(
  p_invoice_id UUID,
  p_lines JSONB,
  p_total_ht DECIMAL,
  p_total_tva DECIMAL,
  p_total_ttc DECIMAL
) RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  DELETE FROM invoice_lines WHERE invoice_id = p_invoice_id;

  IF jsonb_array_length(COALESCE(p_lines, '[]'::JSONB)) > 0 THEN
    INSERT INTO invoice_lines (
      invoice_id, description, quantity, unit, unit_price, tva_rate,
      total_ht, sort_order,
      discount_type, discount_value, line_type, service_catalog_id
    )
    SELECT
      p_invoice_id,
      (line->>'description')::TEXT,
      (line->>'quantity')::DECIMAL,
      COALESCE((line->>'unit')::TEXT, 'unité'),
      (line->>'unit_price')::DECIMAL,
      (line->>'tva_rate')::DECIMAL,
      (line->>'total_ht')::DECIMAL,
      (line->>'sort_order')::INTEGER,
      NULLIF(line->>'discount_type', '')::TEXT,
      COALESCE((line->>'discount_value')::DECIMAL, 0),
      COALESCE((line->>'line_type')::TEXT, 'item'),
      NULLIF(line->>'service_catalog_id', '')::UUID
    FROM jsonb_array_elements(p_lines) AS line;
  END IF;

  UPDATE invoices
  SET total_ht = p_total_ht,
      total_tva = p_total_tva,
      total_ttc = p_total_ttc,
      updated_at = NOW()
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Re-apply grants (paranoia, CREATE OR REPLACE devrait preserver)
REVOKE EXECUTE ON FUNCTION public.save_quote_lines(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_invoice_lines(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_quote_lines(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_invoice_lines(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL) TO authenticated;

NOTIFY pgrst, 'reload schema';
