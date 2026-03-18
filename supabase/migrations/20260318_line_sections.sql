-- Migration: Add line_type to quote_lines and invoice_lines for section headers

ALTER TABLE quote_lines
  ADD COLUMN IF NOT EXISTS line_type TEXT NOT NULL DEFAULT 'item'
    CHECK (line_type IN ('item', 'section'));

ALTER TABLE invoice_lines
  ADD COLUMN IF NOT EXISTS line_type TEXT NOT NULL DEFAULT 'item'
    CHECK (line_type IN ('item', 'section'));
