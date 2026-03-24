-- Migration: Email settings for document sending via Resend

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
  ADD COLUMN IF NOT EXISTS email_from TEXT,
  ADD COLUMN IF NOT EXISTS email_from_name TEXT,
  ADD COLUMN IF NOT EXISTS email_quote_subject TEXT DEFAULT 'Votre devis {numero} — {entreprise}',
  ADD COLUMN IF NOT EXISTS email_quote_body TEXT DEFAULT '<p>Bonjour,</p><p>Veuillez trouver ci-joint votre devis <strong>{numero}</strong> d''un montant de <strong>{montant_ttc} €</strong>.</p><p>Ce devis est valable jusqu''au {date_validite}.</p><p>N''hésitez pas à nous contacter pour toute question.</p><p>Cordialement,<br>{entreprise}</p>',
  ADD COLUMN IF NOT EXISTS email_invoice_subject TEXT DEFAULT 'Votre facture {numero} — {entreprise}',
  ADD COLUMN IF NOT EXISTS email_invoice_body TEXT DEFAULT '<p>Bonjour,</p><p>Veuillez trouver ci-joint votre facture <strong>{numero}</strong> d''un montant de <strong>{montant_ttc} €</strong>.</p><p>Date d''échéance : {date_echeance}.</p><p>Cordialement,<br>{entreprise}</p>';

NOTIFY pgrst, 'reload schema';
