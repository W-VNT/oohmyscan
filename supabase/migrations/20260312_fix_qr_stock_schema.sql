-- Migration: Align qr_stock table with application code
-- Renames columns and changes status from text enum to boolean is_assigned

-- 1. Rename columns to match TypeScript types
ALTER TABLE qr_stock RENAME COLUMN qr_code TO uuid_code;
ALTER TABLE qr_stock RENAME COLUMN assigned_panel_id TO panel_id;
ALTER TABLE qr_stock RENAME COLUMN created_at TO generated_at;

-- 2. Drop old status check constraint and column, add boolean is_assigned
ALTER TABLE qr_stock DROP CONSTRAINT IF EXISTS qr_stock_status_check;
ALTER TABLE qr_stock ADD COLUMN is_assigned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE qr_stock ADD COLUMN assigned_at TIMESTAMPTZ;

-- 3. Migrate existing data: mark assigned based on old status
UPDATE qr_stock SET
  is_assigned = (status = 'assigned'),
  assigned_at = CASE WHEN status = 'assigned' THEN NOW() ELSE NULL END;

-- 4. Drop old columns no longer needed
ALTER TABLE qr_stock DROP COLUMN status;
ALTER TABLE qr_stock DROP COLUMN batch_name;

-- 5. Add operator read policy so terrain app can check QR existence
CREATE POLICY "Operators can read qr_stock"
  ON qr_stock FOR SELECT
  USING (auth.role() = 'authenticated');
