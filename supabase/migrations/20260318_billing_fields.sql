-- Migration: Add missing billing fields
-- 1. Client reference (dossier/PO#) on quotes and invoices
-- 2. Late penalty text on company_settings

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS client_reference TEXT;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS client_reference TEXT;

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS late_penalty_text TEXT;
