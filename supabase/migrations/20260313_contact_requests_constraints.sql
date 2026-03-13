-- Security hardening: add length constraints and email validation
ALTER TABLE contact_requests
  ADD CONSTRAINT chk_name_length CHECK (char_length(name) <= 200),
  ADD CONSTRAINT chk_company_length CHECK (char_length(company) <= 200),
  ADD CONSTRAINT chk_email_length CHECK (char_length(email) <= 320),
  ADD CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT chk_city_length CHECK (char_length(city) <= 200),
  ADD CONSTRAINT chk_support_interest_length CHECK (char_length(support_interest) <= 100),
  ADD CONSTRAINT chk_message_length CHECK (char_length(message) <= 5000),
  ADD CONSTRAINT chk_source_length CHECK (char_length(source) <= 50);

-- Rate limiting: max 3 submissions per email per hour (enforced via RLS)
DROP POLICY IF EXISTS "Public can submit contact" ON contact_requests;

CREATE POLICY "Public can submit contact (rate limited)" ON contact_requests
  FOR INSERT WITH CHECK (
    (SELECT count(*) FROM contact_requests
     WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
       AND created_at > now() - interval '1 hour') < 3
    OR current_setting('request.jwt.claims', true)::json->>'email' IS NULL
  );

-- Note: RLS-based rate limiting only works for authenticated users.
-- For anonymous submissions, use a simpler approach:
-- Limit total anonymous inserts per minute globally.
DROP POLICY IF EXISTS "Public can submit contact (rate limited)" ON contact_requests;

CREATE POLICY "Public can submit contact" ON contact_requests
  FOR INSERT WITH CHECK (
    -- Limit: no more than 10 anonymous submissions in the last minute globally
    (SELECT count(*) FROM contact_requests
     WHERE created_at > now() - interval '1 minute') < 10
  );
