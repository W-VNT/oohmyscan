-- QR stock : ajout d'un numéro de série séquentiel pour la traçabilité d'impression
-- Permet d'identifier visuellement chaque étiquette (#1, #2, ..., #76, ...)
-- et de savoir quels QR ont déjà été imprimés ou ont planté

-- 1. Créer la séquence
CREATE SEQUENCE IF NOT EXISTS qr_stock_serial_seq;

-- 2. Ajouter la colonne (nullable temporairement pour backfill)
ALTER TABLE qr_stock
  ADD COLUMN IF NOT EXISTS serial_number INTEGER;

-- 3. Backfill des lignes existantes par ordre de génération
UPDATE qr_stock
  SET serial_number = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY generated_at, id) AS rn
  FROM qr_stock
  WHERE serial_number IS NULL
) sub
WHERE qr_stock.id = sub.id;

-- 4. Synchroniser la séquence sur le max actuel
SELECT setval(
  'qr_stock_serial_seq',
  COALESCE((SELECT MAX(serial_number) FROM qr_stock), 0),
  true
);

-- 5. Default + NOT NULL + UNIQUE
ALTER TABLE qr_stock
  ALTER COLUMN serial_number SET DEFAULT nextval('qr_stock_serial_seq');

ALTER TABLE qr_stock
  ALTER COLUMN serial_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS qr_stock_serial_number_key
  ON qr_stock(serial_number);

-- 6. Index pour tri rapide
CREATE INDEX IF NOT EXISTS qr_stock_serial_number_idx
  ON qr_stock(serial_number DESC);
