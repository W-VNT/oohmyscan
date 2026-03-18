-- Migration: Terms and conditions (CGV) support

-- Rich text CGV stored in company_settings
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;

-- Per-document toggle to include CGV
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS include_terms BOOLEAN DEFAULT true;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS include_terms BOOLEAN DEFAULT true;
