-- Migration: Custom fields support (JSONB flexible)

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- Custom field definitions stored in company_settings
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS custom_field_definitions JSONB DEFAULT '[]';
-- Format: [{ "key": "po_number", "label": "N° commande", "type": "text", "on": ["quote", "invoice"] }]
