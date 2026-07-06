-- ============================================================================
-- Fix : get_next_contract_number() utilisait COUNT(*) + 1
-- Probleme : si un contrat est supprime ou si un numero est saute (gap),
-- COUNT ne reflete plus le vrai max -> renvoie un numero deja pris ->
-- 23505 duplicate key value violates unique constraint.
--
-- Fix : utilise MAX(numero) + 1 base sur le suffixe numerique parse.
-- Meme pattern que get_next_amendment_number (next_amendment_number counter).
-- ============================================================================
CREATE OR REPLACE FUNCTION get_next_contract_number()
RETURNS TEXT AS $$
DECLARE
  year_str TEXT;
  max_num INT;
  num TEXT;
BEGIN
  year_str := EXTRACT(YEAR FROM NOW())::TEXT;
  -- Lock pour eviter les race conditions concurrentes
  LOCK TABLE panel_contracts IN SHARE ROW EXCLUSIVE MODE;
  -- Extrait le suffixe numerique des contrats de l'annee courante
  -- Format attendu : CONT-YYYY-XXX (ex: CONT-2026-042)
  -- Le regex [0-9]+$ capture le dernier bloc de chiffres.
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(contract_number FROM '[0-9]+$') AS INT)),
    0
  ) INTO max_num
  FROM panel_contracts
  WHERE contract_number LIKE 'CONT-' || year_str || '-%';
  num := 'CONT-' || year_str || '-' || LPAD((max_num + 1)::TEXT, 3, '0');
  RETURN num;
END;
$$ LANGUAGE plpgsql;
