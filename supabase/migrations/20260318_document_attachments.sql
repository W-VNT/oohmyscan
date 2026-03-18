-- Migration: Document attachments for quotes and invoices

CREATE TABLE document_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL CHECK (document_type IN ('quote', 'invoice')),
  document_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE document_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on document_attachments"
  ON document_attachments FOR ALL USING (is_admin());

-- Storage bucket (must be created via dashboard or CLI, this is just a reference)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('document-attachments', 'document-attachments', false);
