const dbName = "dragon-stt-model"
const storeName = "artifacts"

export type storedWeights = {
  bytes: ArrayBuffer
  source: string
  savedAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(storeName)) {
          req.result.createObjectStore(storeName)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error ?? new Error("indexeddb failed"))
    })
  }
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(storeName, mode)
        const req = run(t.objectStore(storeName))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error ?? new Error("indexeddb failed"))
      }),
  )
}

export async function saveWeights(bytes: ArrayBuffer, source: string): Promise<void> {
  const rec: storedWeights = { bytes, source, savedAt: Date.now() }
  await tx("readwrite", (s) => s.put(rec, "weights"))
}

export async function getWeights(): Promise<storedWeights | null> {
  const rec = await tx<storedWeights | undefined>("readonly", (s) => s.get("weights"))
  return rec ?? null
}

export async function saveVocab(chars: string[]): Promise<void> {
  await tx("readwrite", (s) => s.put(chars, "vocab"))
}

export async function getStoredVocab(): Promise<string[] | null> {
  const rec = await tx<string[] | undefined>("readonly", (s) => s.get("vocab"))
  return Array.isArray(rec) ? rec : null
}

export async function clearModel(): Promise<void> {
  await tx("readwrite", (s) => s.clear())
}

export function parseVocab(text: string): string[] | null {
  try {
    const chars = JSON.parse(text) as unknown
    if (!Array.isArray(chars)) return null
    if (!chars.every((c) => typeof c === "string")) return null
    if (!chars.includes("")) return null
    return chars as string[]
  } catch {
    return null
  }
}
