/**
 * Queue IndexedDB pour les photos qui n'ont pas pu etre uploadees
 * immediatement (hors ligne ou upload en erreur). Un service de sync
 * (voir useOfflineSync) dépile la queue automatiquement au retour
 * du réseau.
 *
 * Choix : IndexedDB plutôt que localStorage car on stocke des Blobs
 * (photos compressees) qui peuvent faire ~500Ko/piece. localStorage
 * est en string/base64 (~x1.33 taille) et limite ~5-10Mo.
 */

const DB_NAME = 'oohmyad-offline'
const DB_VERSION = 1
const STORE = 'photos'

export interface QueuedPhoto {
  id: string
  bucket: string
  storagePath: string
  contentType: string
  blob: Blob
  createdAt: number
  attempts: number
  lastError: string | null
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
  })
  return dbPromise
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

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IDB request failed'))
  })
}

/** Ajoute une photo dans la queue. */
export async function enqueuePhoto(
  entry: Omit<QueuedPhoto, 'id' | 'createdAt' | 'attempts' | 'lastError'>,
): Promise<string> {
  const id = crypto.randomUUID()
  const record: QueuedPhoto = {
    id,
    ...entry,
    createdAt: Date.now(),
    attempts: 0,
    lastError: null,
  }
  await withStore('readwrite', (store) => idbRequest(store.add(record)))
  return id
}

/** Retire une photo de la queue (upload OK). */
export async function removeQueuedPhoto(id: string): Promise<void> {
  await withStore('readwrite', (store) => idbRequest(store.delete(id)))
}

/** Met à jour le compteur d'essais / dernière erreur. */
export async function updateQueuedPhoto(
  id: string,
  patch: Partial<Pick<QueuedPhoto, 'attempts' | 'lastError'>>,
): Promise<void> {
  await withStore('readwrite', async (store) => {
    const current = await idbRequest(store.get(id))
    if (!current) return
    await idbRequest(store.put({ ...current, ...patch }))
  })
}

/** Liste toutes les photos en attente, plus vieilles en premier. */
export async function listQueuedPhotos(): Promise<QueuedPhoto[]> {
  const all = await withStore('readonly', (store) => idbRequest(store.getAll()))
  return (all ?? []).sort((a, b) => a.createdAt - b.createdAt)
}

/** Nombre de photos en attente (pour affichage badge). */
export async function countQueuedPhotos(): Promise<number> {
  const all = await withStore('readonly', (store) => idbRequest(store.count()))
  return all ?? 0
}

/** Purge toute la queue des photos en attente. */
export async function clearQueuedPhotos(): Promise<void> {
  await withStore('readwrite', (store) => idbRequest(store.clear()))
}
