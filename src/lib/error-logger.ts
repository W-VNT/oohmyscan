import { supabase } from '@/lib/supabase'

/**
 * Categorisation des logs pour filtrage back-office.
 * Ajoute une valeur ici quand tu instrumentes un nouveau flow.
 */
export type LogContext =
  | 'install'         // wizard install / handleFinalSave / ensureLocationExists
  | 'scan'            // ScanPage, QR resolution
  | 'pdf'             // invocation edge fn generate-contract-pdf
  | 'offline_replay'  // useOfflineSync / performInstallSave
  | 'auth'            // login / invite / role change
  | 'other'

export type LogSeverity = 'info' | 'warn' | 'error'

/**
 * Log un evenement client vers la table activity_logs.
 * Best-effort : les erreurs de log elles-memes sont swallow (pas de recursion).
 *
 * @param severity 'info' pour une action normale, 'warn' pour un cas limite,
 *                 'error' pour une erreur bloquante.
 * @param context Categorie large (install, scan, pdf...)
 * @param action Nom court du step (contract_signed, insert_location...)
 * @param message Texte lisible (err.message ou description action)
 * @param details Payload libre pour debug (location_id, panel_id, contract_number...)
 */
async function log(
  severity: LogSeverity,
  context: LogContext,
  action: string,
  message: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
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

    await supabase.from('activity_logs').insert({
      user_id: userId,
      user_role: userRole,
      severity,
      context,
      action,
      message: message.slice(0, 500),
      details: details ?? null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      url: typeof window !== 'undefined' ? window.location.href : null,
    })
  } catch {
    // Ne jamais throw depuis log() — recursion garantie
  }
}

/**
 * Log une erreur (severity=error). Extrait automatiquement le message + stack
 * + PostgrestError code/hint/details.
 */
export async function logError(
  context: LogContext,
  action: string,
  err: unknown,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const message = err instanceof Error
    ? err.message
    : typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message: unknown }).message)
      : String(err)

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

  return log('error', context, action, message, details)
}

/**
 * Log une action utilisateur (severity=info). Utile pour comprendre le
 * parcours d'un operateur quand il rappelle : "j'ai fait X puis Y".
 */
export async function logAction(
  context: LogContext,
  action: string,
  message: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return log('info', context, action, message, metadata ? { metadata } : undefined)
}

/**
 * Log un warning (severity=warn). Cas limite qui n'a pas casse le flow mais
 * merite l'attention (ex: retry sur duplicate contract_number, fallback offline...)
 */
export async function logWarn(
  context: LogContext,
  action: string,
  message: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return log('warn', context, action, message, metadata ? { metadata } : undefined)
}
