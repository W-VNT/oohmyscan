import { supabase } from '@/lib/supabase'
import {
  enqueuePhoto,
  removeQueuedPhoto,
  updateQueuedPhoto,
  listQueuedPhotos,
} from '@/lib/offline-photo-queue'

export interface UploadResult {
  path: string
  /** true si la photo est en queue (upload différé), false si l'upload a réussi immédiatement. */
  queued: boolean
}

/**
 * Upload une photo vers Supabase Storage. Si le réseau est down ou que
 * l'upload échoue avec une erreur network, la photo est mise en queue
 * IndexedDB pour un upload différé au retour du réseau.
 *
 * Le path retourné est TOUJOURS le path final (queué ou pas). Les tables
 * qui référencent des photos (panel_photos, panel_contracts, etc.) peuvent
 * donc être remplies immédiatement — la photo apparaîtra dès que la sync
 * aura lieu.
 */
export async function uploadPhoto(params: {
  bucket: string
  folder: string
  blob: Blob
  contentType: string
  extension?: string
}): Promise<UploadResult> {
  const ext = params.extension ?? params.blob.type.split('/')[1] ?? 'jpg'
  const path = `${params.folder}/${crypto.randomUUID()}.${ext}`

  // Tentative d'upload direct si en ligne
  if (navigator.onLine) {
    try {
      const { error } = await supabase.storage
        .from(params.bucket)
        .upload(path, params.blob, {
          contentType: params.contentType,
          upsert: false,
        })
      if (!error) return { path, queued: false }
      // Erreur non-réseau : on remonte
      const isNetwork = /network|fetch|failed/i.test(error.message)
      if (!isNetwork) throw error
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const isNetwork = /network|fetch|failed|typeerror/i.test(msg)
      if (!isNetwork) throw e
    }
  }

  // Fallback : mise en queue pour upload ultérieur
  await enqueuePhoto({
    bucket: params.bucket,
    storagePath: path,
    contentType: params.contentType,
    blob: params.blob,
  })
  return { path, queued: true }
}

/**
 * Dépile la queue en essayant d'uploader chaque photo en attente.
 * Retourne le nombre d'uploads réussis pendant l'exécution.
 * À appeler au retour du réseau ou périodiquement.
 */
export async function processQueue(options?: { maxAttempts?: number }): Promise<{
  uploaded: number
  remaining: number
  failed: number
}> {
  const maxAttempts = options?.maxAttempts ?? 5
  if (!navigator.onLine) {
    const remaining = (await listQueuedPhotos()).length
    return { uploaded: 0, remaining, failed: 0 }
  }

  const queue = await listQueuedPhotos()
  let uploaded = 0
  let failed = 0

  for (const item of queue) {
    if (item.attempts >= maxAttempts) {
      failed++
      continue
    }
    try {
      const { error } = await supabase.storage
        .from(item.bucket)
        .upload(item.storagePath, item.blob, {
          contentType: item.contentType,
          upsert: true, // Idempotent : si déjà uploadé, ok
        })
      if (error) {
        const isNetwork = /network|fetch|failed/i.test(error.message)
        await updateQueuedPhoto(item.id, {
          attempts: item.attempts + 1,
          lastError: error.message,
        })
        if (!isNetwork) failed++
        // Sinon on continue à la prochaine sync
      } else {
        await removeQueuedPhoto(item.id)
        uploaded++
      }
    } catch (e) {
      await updateQueuedPhoto(item.id, {
        attempts: item.attempts + 1,
        lastError: e instanceof Error ? e.message : String(e),
      })
    }
  }

  const remainingList = await listQueuedPhotos()
  return { uploaded, remaining: remainingList.length, failed }
}
