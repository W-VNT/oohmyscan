-- Fix: panels_without_location view should use SECURITY INVOKER (default)
-- This ensures RLS policies of the querying user are enforced

DROP VIEW IF EXISTS panels_without_location;

CREATE VIEW panels_without_location
  WITH (security_invoker = true)
  AS SELECT * FROM panels WHERE location_id IS NULL;
