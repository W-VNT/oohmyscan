-- Migration: Support PDF upload for terms_and_conditions
-- A uploaded PDF overrides the rich-text CGV in generated documents (quote/invoice)

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS terms_and_conditions_pdf_path TEXT;

-- Storage bucket pour les PDFs de l'entreprise (CGV, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('company-pdfs', 'company-pdfs', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Policies: admin only (lecture + ecriture + suppression)
DROP POLICY IF EXISTS "Admin uploads company PDFs" ON storage.objects;
CREATE POLICY "Admin uploads company PDFs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'company-pdfs' AND is_admin()
  );

DROP POLICY IF EXISTS "Admin reads company PDFs" ON storage.objects;
CREATE POLICY "Admin reads company PDFs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'company-pdfs' AND is_admin()
  );

DROP POLICY IF EXISTS "Admin updates company PDFs" ON storage.objects;
CREATE POLICY "Admin updates company PDFs" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'company-pdfs' AND is_admin()
  );

DROP POLICY IF EXISTS "Admin deletes company PDFs" ON storage.objects;
CREATE POLICY "Admin deletes company PDFs" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'company-pdfs' AND is_admin()
  );

NOTIFY pgrst, 'reload schema';
