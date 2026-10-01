-- ============================================================================
-- Audit securite — Lot C : types et tailles de fichiers acceptes (serveur)
--
-- Le front valide deja (src/lib/upload-validation.ts) mais un appel direct a
-- l'API Storage le contourne. Ces limites sont appliquees par Supabase.
--
-- Non modifie volontairement : panel-photos (photos terrain, contrats,
-- signatures). Un format photo inattendu (ex. HEIC) y serait refuse et
-- bloquerait une pose sur le terrain.
-- Les fichiers deja stockes ne sont pas affectes.
-- ============================================================================

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'],
    file_size_limit = 20 * 1024 * 1024
WHERE id = 'campaign-visuals';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'],
    file_size_limit = 5 * 1024 * 1024
WHERE id = 'company-assets';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    file_size_limit = 20 * 1024 * 1024
WHERE id = 'document-attachments';

-- Verification
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
ORDER BY id;
