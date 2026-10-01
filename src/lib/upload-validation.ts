/**
 * Validation des fichiers envoyes vers le Storage. L'extension stockee est
 * deduite du type MIME (jamais du nom de fichier fourni par l'utilisateur),
 * pour eviter de stocker un .html/.svg executable sous une fausse extension.
 */
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
}

export const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp']
export const ATTACHMENT_MIMES = [
  ...IMAGE_MIMES,
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

export type UploadCheck = { ok: true; ext: string } | { ok: false; error: string }

export function validateUpload(file: File, allowedMimes: string[], maxMb: number): UploadCheck {
  const ext = EXTENSION_BY_MIME[file.type]
  if (!allowedMimes.includes(file.type) || !ext) {
    return { ok: false, error: `Format non supporté (${file.name}).` }
  }
  if (file.size > maxMb * 1024 * 1024) {
    return { ok: false, error: `Fichier trop volumineux (${file.name}, max ${maxMb} Mo).` }
  }
  return { ok: true, ext }
}
