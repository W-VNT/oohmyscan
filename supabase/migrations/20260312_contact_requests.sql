-- Landing page contact form submissions
CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  city TEXT,
  support_interest TEXT,
  message TEXT NOT NULL,
  source TEXT DEFAULT 'landing',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Public can submit contact requests (landing page is unauthenticated)
CREATE POLICY "Public can submit contact" ON contact_requests
  FOR INSERT WITH CHECK (true);

-- Only admins can read contact requests
CREATE POLICY "Admin reads contacts" ON contact_requests
  FOR SELECT USING (is_admin());
