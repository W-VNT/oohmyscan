-- Migration: Add per-line discount support on quote_lines and invoice_lines

ALTER TABLE quote_lines
  ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IS NULL OR discount_type IN ('percent', 'amount')),
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) DEFAULT 0;

ALTER TABLE invoice_lines
  ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IS NULL OR discount_type IN ('percent', 'amount')),
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) DEFAULT 0;
