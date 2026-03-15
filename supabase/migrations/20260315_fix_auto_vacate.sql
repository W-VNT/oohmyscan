-- Fix: auto_vacate_panels_on_campaign_end()
-- Previously, when a campaign was completed, ALL its assigned panels were set
-- to 'vacant' regardless of whether they had other active campaign assignments.
-- This fix only vacates panels that have NO remaining active campaign assignment.

CREATE OR REPLACE FUNCTION auto_vacate_panels_on_campaign_end()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Step 1: Mark all active assignments for this campaign as unassigned
    UPDATE panel_campaigns
    SET unassigned_at = NOW()
    WHERE campaign_id = NEW.id AND unassigned_at IS NULL;

    -- Step 2: Set panels back to 'vacant' ONLY if they have no other active
    -- campaign assignment. A panel still has an active assignment if another
    -- panel_campaigns row exists where:
    --   - unassigned_at IS NULL (still assigned)
    --   - the linked campaign has status = 'active'
    -- This prevents incorrectly vacating panels shared across multiple campaigns.
    UPDATE panels
    SET status = 'vacant',
        updated_at = NOW()
    WHERE id IN (
      SELECT panel_id FROM panel_campaigns
      WHERE campaign_id = NEW.id
    )
    AND status = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM panel_campaigns pc
      JOIN campaigns c ON c.id = pc.campaign_id
      WHERE pc.panel_id = panels.id
        AND pc.unassigned_at IS NULL
        AND c.status = 'active'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
