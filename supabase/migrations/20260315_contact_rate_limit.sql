-- Improve contact form rate limiting: per-email + global safety net
-- Idempotent: drops old policy before creating new one

DROP POLICY IF EXISTS "Public can submit contact" ON contact_requests;
DROP POLICY IF EXISTS "Public can submit contact (rate limited)" ON contact_requests;

CREATE POLICY "Public can submit contact" ON contact_requests
  FOR INSERT WITH CHECK (
    -- Per-email limit: max 3 submissions per email per 10 minutes
    (SELECT count(*) FROM contact_requests cr
     WHERE cr.email = (contact_requests.email)
       AND cr.created_at > now() - interval '10 minutes') < 3
    AND
    -- Global safety net: max 10 submissions per minute across all emails
    (SELECT count(*) FROM contact_requests cr
     WHERE cr.created_at > now() - interval '1 minute') < 10
  );
