// ============================================================================
// Helpers partages entre index.ts et les templates. Meme comportement que
// src/lib/pdf/pdf-helpers.ts cote client (portage minimaliste).
// ============================================================================

export function formatDateFR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Convertit un Blob (retour de storage.download) en data URL base64,
 * utilisable directement dans <Image src="..."/> de @react-pdf/renderer.
 * Detecte le MIME depuis le blob.type, fallback image/png si absent.
 */
export async function blobToDataUrl(blob: Blob, fallbackMime = "image/png"): Promise<string> {
  const mime = blob.type || fallbackMime;
  const buf = new Uint8Array(await blob.arrayBuffer());
  // btoa n'accepte pas les buffers directement, il faut passer par une string
  // binaire. Chunk pour eviter les limites de stack sur gros buffers.
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < buf.byteLength; i += chunkSize) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunkSize));
  }
  const b64 = btoa(binary);
  return `data:${mime};base64,${b64}`;
}
