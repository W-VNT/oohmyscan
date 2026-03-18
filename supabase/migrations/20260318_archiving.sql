-- Migration: Add archiving support for quotes and invoices

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
