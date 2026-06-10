-- ============================================================================
-- Payment terms : conditions de règlement unifiées devis + factures
-- ============================================================================
-- Ajoute payment_terms sur quotes (n'existait pas) et étend la liste des
-- valeurs autorisées sur invoices (de 5 à 9 valeurs).
--
-- 60_days_eom est conservé dans le CHECK pour préserver les factures
-- existantes mais ne sera plus proposé dans le dropdown du front.
-- ============================================================================

-- 1. quotes.payment_terms
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS payment_terms TEXT NOT NULL DEFAULT '30_days'
  CHECK (payment_terms IN (
    'cash_on_order',
    'on_receipt',
    'deposit_50_30_days',
    'deposit_50_30_days_eom',
    '30_days',
    '30_days_eom',
    '45_days_eom',
    '60_days',
    '60_days_eom'
  ));

COMMENT ON COLUMN quotes.payment_terms IS 'Conditions de règlement (cash_on_order, on_receipt, deposit_50_30_days, deposit_50_30_days_eom, 30_days, 30_days_eom, 45_days_eom, 60_days, 60_days_eom)';

-- 2. invoices.payment_terms : remplace l'ancien CHECK (5 valeurs) par le nouveau (9 valeurs)
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_payment_terms_check;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_payment_terms_check
  CHECK (payment_terms IN (
    'cash_on_order',
    'on_receipt',
    'deposit_50_30_days',
    'deposit_50_30_days_eom',
    '30_days',
    '30_days_eom',
    '45_days_eom',
    '60_days',
    '60_days_eom'
  ));

COMMENT ON COLUMN invoices.payment_terms IS 'Conditions de règlement (cash_on_order, on_receipt, deposit_50_30_days, deposit_50_30_days_eom, 30_days, 30_days_eom, 45_days_eom, 60_days, 60_days_eom)';
