/**
 * Queue IndexedDB pour les mutations DB qui doivent être rejouées lors
 * de la reconnexion (installations, avenants, dépôts). Séparée du store
 * photos (voir offline-photo-queue) car les mutations ont une logique
 * de replay plus complexe (dépendances, PDF, email).
 *
 * v2 : pour l'instant on ne queue que les installations complètes
 * (installations = un save du InstallWizard).
 */

import type { Location } from '@/types'

const DB_NAME = 'oohmyad-offline'
const DB_VERSION = 2 // incremente pour ajouter le nouveau store
const STORE = 'installs'

export interface InstalledPanelData {
  panelId: string
  qrCode: string
  reference: string
  /** Legacy — plus capture depuis le nouveau flow (juillet 2026).
   *  Reste optionnel pour ne pas casser les items deja en queue. */
  photoPath?: string
  /** Legacy — plus capture depuis le nouveau flow (juillet 2026).
   *  Reste optionnel pour ne pas casser les items deja en queue. */
  zone?: string
  /** Diffusion inline lors du wizard : campagne + photo visuel pose.
   *  Applique apres creation du panneau + contrat. */
  pendingAssign?: {
    campaignId: string
    photoPath: string
  }
}

export interface PendingInstall {
  id: string
  createdAt: number
  attempts: number
  lastError: string | null
  /** État à rejouer à la sync. */
  payload: {
    location: Location
    installed: InstalledPanelData[]
    /** base64 data URLs, à uploader au replay. */
    signOwner: string
    signOperator: string
    plannedPanelsCount?: number
    /** true = avenant (contrat déjà existant sur ce lieu). */
    isAmendment: boolean
    /** true = le lieu n'a JAMAIS ete inseree en DB (creation locale dans le
     *  wizard). Le replay doit alors inserer le lieu avant les panneaux/contrat.
     *  L'id du location est un UUID temporaire genere cote client. */
    isNewLocation?: boolean
    userId: string
    /** GPS approximatif au moment du save (fallback pour panels.lat/lng). */
    lat?: number
    lng?: number
  }
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IDB open failed'))
  })
  return dbPromise
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IDB request failed'))
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const store = tx.objectStore(STORE)
    Promise.resolve(fn(store)).then(resolve, reject)
    tx.onerror = () => reject(tx.error ?? new Error('IDB transaction failed'))
  })
}

export async function enqueueInstall(
  payload: PendingInstall['payload'],
): Promise<string> {
  const id = crypto.randomUUID()
  const record: PendingInstall = {
    id,
    createdAt: Date.now(),
    attempts: 0,
    lastError: null,
    payload,
  }
  await withStore('readwrite', (s) => idbRequest(s.add(record)))
  return id
}

export async function listPendingInstalls(): Promise<PendingInstall[]> {
  const all = await withStore('readonly', (s) => idbRequest(s.getAll()))
  return (all ?? []).sort((a, b) => a.createdAt - b.createdAt)
}

export async function updatePendingInstall(
  id: string,
  patch: Partial<Pick<PendingInstall, 'attempts' | 'lastError'>>,
): Promise<void> {
  await withStore('readwrite', async (s) => {
    const current = await idbRequest(s.get(id))
    if (!current) return
    await idbRequest(s.put({ ...current, ...patch }))
  })
}

export async function removePendingInstall(id: string): Promise<void> {
  await withStore('readwrite', (s) => idbRequest(s.delete(id)))
}

export async function countPendingInstalls(): Promise<number> {
  const n = await withStore('readonly', (s) => idbRequest(s.count()))
  return n ?? 0
}

/** Purge toute la queue des installations en attente. */
export async function clearPendingInstalls(): Promise<void> {
  await withStore('readwrite', (s) => idbRequest(s.clear()))
}
