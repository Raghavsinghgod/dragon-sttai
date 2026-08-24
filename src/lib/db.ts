import { toast } from "sonner"

export type historyEntry = {
  id?: number
  text: string
  duration: number
  createdAt: number
  modelVer: string
}

const dbName = "dragon-stt"
const storeName = "history"

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, {
            keyPath: "id",
            autoIncrement: true,
          })
          store.createIndex("createdAt", "createdAt")
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error ?? new Error("indexeddb failed"))
    })
  }
  return dbPromise
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
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

export async function addEntry(entry: historyEntry): Promise<void> {
  try {
    await tx("readwrite", (s) => s.add(entry))
  } catch {
    toast.error("could not save to history")
  }
}

export async function listEntries(): Promise<historyEntry[]> {
  const all = await tx<historyEntry[]>("readonly", (s) => s.getAll())
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteEntry(id: number): Promise<void> {
  await tx("readwrite", (s) => s.delete(id))
}
