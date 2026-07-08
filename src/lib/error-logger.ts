import { supabase } from '@/lib/supabase'

/**
 * Categorisation des erreurs pour filtrage back-office.
 * Ajoute une valeur ici quand tu instrumentes un nouveau flow.
 */
export type ErrorContext =
  | 'install'         // wizard install / handleFinalSave / ensureLocationExists
  | 'scan'            // ScanPage, QR resolution
  | 'pdf'             // invocation edge fn generate-contract-pdf
  | 'offline_replay'  // useOfflineSync / performInstallSave
  | 'auth'            // login / invite / role change
  | 'other'

/**
 * Log une erreur cote client vers la table error_logs.
 * Best-effort : les erreurs de log elles-memes sont swallow (pas de recursion).
 *
 * @param context Categorie large (install, scan, pdf...)
 * @param action Nom court du step qui a echoue (insert_location, invoke_pdf_gen...)
 * @param err L'erreur brute (Error, PostgrestError, unknown)
 * @param metadata Cle-valeurs libres qui aident au debug (location_id, panel_id, contract_number...)
 */
export async function logError(
  context: ErrorContext,
  action: string,
  err: unknown,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const message = err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err)

    // Extraction du max d'info sur l'erreur (Error stack, PostgrestError code/hint/details)
    const details: Record<string, unknown> = {}
    if (err instanceof Error) {
      details.stack = err.stack
      details.name = err.name
    }
    if (err && typeof err === 'object') {
      const obj = err as Record<string, unknown>
      for (const k of ['code', 'hint', 'details', 'status', 'statusText']) {
        if (k in obj) details[k] = obj[k]
      }
    }
    if (metadata) details.metadata = metadata

    // Snapshot user (best-effort, on log meme si getUser fail)
    let userId: string | null = null
    let userRole: string | null = null
    try {
      const { data: sess } = await supabase.auth.getSession()
      userId = sess.session?.user?.id ?? null
      if (userId) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle()
        userRole = (prof?.role as string | undefined) ?? null
      }
    } catch { /* swallow */ }

    await supabase.from('error_logs').insert({
      user_id: userId,
      user_role: userRole,
      context,
      action,
      message: message.slice(0, 500),
      details,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      url: typeof window !== 'undefined' ? window.location.href : null,
    })
  } catch {
    // Ne jamais throw depuis logError — recursion garantie
    // (l'erreur de log echouerait a se logger elle-meme)
  }
}
