-- ============================================================================
-- Lot 3 — Notification admin quand un commercial passe un devis en "Accepte"
--
-- Les admins transforment ensuite le devis en facture. Meme mecanique que
-- notify_admins_panel_report (notification in-app par admin actif).
-- Ne se declenche que si c'est un commercial qui fait la transition : un
-- admin qui accepte lui-meme un devis n'a pas besoin d'etre prevenu.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_admins_quote_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  commercial_name TEXT;
  client_name TEXT;
  admin_id UUID;
BEGIN
  IF NOT (NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted') THEN
    RETURN NEW;
  END IF;
  IF NOT public.is_commercial() THEN
    RETURN NEW;
  END IF;

  SELECT p.full_name INTO commercial_name FROM profiles p WHERE p.id = auth.uid();
  SELECT c.company_name INTO client_name FROM clients c WHERE c.id = NEW.client_id;

  FOR admin_id IN
    SELECT id FROM profiles WHERE role = 'admin' AND is_active = true
  LOOP
    INSERT INTO notifications (user_id, type, title, body, link, metadata)
    VALUES (
      admin_id,
      'quote_accepted',
      'Devis accepté — à facturer',
      format('%s · %s · %s € HT (%s)',
        NEW.quote_number,
        COALESCE(client_name, 'Client'),
        replace(to_char(COALESCE(NEW.total_ht, 0), 'FM999999990.00'), '.', ','),
        COALESCE(commercial_name, 'Commercial')),
      '/admin/quotes/' || NEW.id,
      jsonb_build_object('quote_id', NEW.id, 'commercial_id', NEW.commercial_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_admins_quote_accepted() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_admins_quote_accepted ON public.quotes;
CREATE TRIGGER trg_notify_admins_quote_accepted
  AFTER UPDATE OF status ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_quote_accepted();
