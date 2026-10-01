-- Security Advisor (lint 0011) : search_path fige sur la derniere fonction
-- qui ne l'avait pas (fonction trigger updated_at des rapports de campagne).
ALTER FUNCTION public.set_campaign_reports_updated_at() SET search_path = public, pg_temp;
