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

const modelDbName = "dragon-stt-model"
const modelStoreName = "artifacts"

export type storedWeights = {
  bytes: ArrayBuffer
  source: string
  savedAt: number
}

let modelDbPromise: Promise<IDBDatabase> | null = null

function openModelDb(): Promise<IDBDatabase> {
  if (!modelDbPromise) {
    modelDbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(modelDbName, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(modelStoreName)) {
          req.result.createObjectStore(modelStoreName)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error ?? new Error("indexeddb failed"))
    })
  }
  return modelDbPromise
}

function modelTx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return openModelDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(modelStoreName, mode)
        const req = run(t.objectStore(modelStoreName))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error ?? new Error("indexeddb failed"))
      }),
  )
}

export async function saveWeights(bytes: ArrayBuffer, source: string): Promise<void> {
  const rec: storedWeights = { bytes, source, savedAt: Date.now() }
  await modelTx("readwrite", (s) => s.put(rec, "weights"))
}

export async function getWeights(): Promise<storedWeights | null> {
  const rec = await modelTx<storedWeights | undefined>("readonly", (s) => s.get("weights"))
  return rec ?? null
}

export async function saveVocab(chars: string[]): Promise<void> {
  await modelTx("readwrite", (s) => s.put(chars, "vocab"))
}

export async function getStoredVocab(): Promise<string[] | null> {
  const rec = await modelTx<string[] | undefined>("readonly", (s) => s.get("vocab"))
  return Array.isArray(rec) ? rec : null
}

export async function clearModel(): Promise<void> {
  await modelTx("readwrite", (s) => s.clear())
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

const profileKey = "dragon-stt-profile"

export function getProfile(): string {
  try {
    return localStorage.getItem(profileKey) ?? ""
  } catch {
    return ""
  }
}

export function setProfile(name: string): void {
  try {
    if (name.trim()) localStorage.setItem(profileKey, name.trim())
    else localStorage.removeItem(profileKey)
  } catch {
    return
  }
}

const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) >>> 0 : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(data: Uint8Array<ArrayBuffer>): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = crcTable[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function concat(chunks: Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
  const total = chunks.reduce((a, c) => a + c.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const c of chunks) {
    out.set(c, o)
    o += c.length
  }
  return out
}

function u16(v: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(2)
  new DataView(b.buffer).setUint16(0, v, true)
  return b
}

function u32(v: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, v, true)
  return b
}

function dosDateTime(d: Date): [number, number] {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2)
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return [time, date]
}

export type filePair = [string, string]

export function makeZip(files: filePair[]): Blob {
  const enc = new TextEncoder()
  const [time, date] = dosDateTime(new Date())
  const localParts: Uint8Array<ArrayBuffer>[] = []
  const centralParts: Uint8Array<ArrayBuffer>[] = []
  let offset = 0

  for (const [name, text] of files) {
    const nameBytes = new Uint8Array(enc.encode(name))
    const data = new Uint8Array(enc.encode(text))
    const crc = crc32(data)
    localParts.push(
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(time),
      u16(date),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
      data,
    )
    centralParts.push(
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(time),
      u16(date),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    )
    offset += 30 + nameBytes.length + data.length
  }

  const centralDir = concat(centralParts)
  const eocd = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ])

  return new Blob([concat(localParts), centralDir, eocd], { type: "application/zip" })
}

export function bundleText(files: filePair[]): string {
  return files.map(([name, content]) => `// === ${name} ===\n${content}`).join("\n\n")
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const dayMs = 86400000

export type apiKey = {
  id: string
  name: string
  secret: string
  createdAt: number
  revoked: boolean
  uses: number
  lastUsedAt: number | null
  runs: number[]
}

const storageKey = "dragon-stt-keys"
const activeStorageKey = "dragon-stt-active-key"

function normalize(raw: apiKey): apiKey {
  return {
    ...raw,
    uses: typeof raw.uses === "number" ? raw.uses : 0,
    lastUsedAt: raw.lastUsedAt ?? null,
    runs: Array.isArray(raw.runs) ? raw.runs.slice(-500) : [],
  }
}

function readKeys(): apiKey[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as apiKey[]
    return Array.isArray(parsed) ? parsed.map(normalize) : []
  } catch {
    return []
  }
}

function writeKeys(keys: apiKey[]): void {
  localStorage.setItem(storageKey, JSON.stringify(keys))
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("")
}

export function listKeys(): apiKey[] {
  return readKeys().sort((a, b) => b.createdAt - a.createdAt)
}

export function createKey(name: string): apiKey {
  const key: apiKey = {
    id: crypto.randomUUID(),
    name: name.trim() || "unnamed project",
    secret: `dragon_live_${randomHex(16)}`,
    createdAt: Date.now(),
    revoked: false,
    uses: 0,
    lastUsedAt: null,
    runs: [],
  }
  writeKeys([key, ...readKeys()])
  return key
}

export function setRevoked(id: string, revoked: boolean): void {
  writeKeys(readKeys().map((k) => (k.id === id ? { ...k, revoked } : k)))
}

export function deleteKey(id: string): void {
  writeKeys(readKeys().filter((k) => k.id !== id))
}

export function maskSecret(secret: string): string {
  return `${secret.slice(0, 17)}...${secret.slice(-4)}`
}

export function getActiveKeyId(): string | null {
  try {
    const id = localStorage.getItem(activeStorageKey)
    if (!id) return null
    return readKeys().some((k) => k.id === id && !k.revoked) ? id : null
  } catch {
    return null
  }
}

export function setActiveKey(id: string | null): void {
  try {
    if (id === null) localStorage.removeItem(activeStorageKey)
    else localStorage.setItem(activeStorageKey, id)
  } catch {
    return
  }
}

export function recordKeyUse(): void {
  const id = getActiveKeyId()
  if (!id) return
  const now = Date.now()
  writeKeys(
    readKeys().map((k) =>
      k.id === id
        ? { ...k, uses: k.uses + 1, lastUsedAt: now, runs: [...k.runs, now].slice(-500) }
        : k,
    ),
  )
}

export function dailyCounts(timestamps: number[], days: number): number[] {
  const counts = new Array<number>(days).fill(0)
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (const ts of timestamps) {
    const that = new Date(ts)
    that.setHours(0, 0, 0, 0)
    const back = Math.round((base.getTime() - that.getTime()) / dayMs)
    const idx = days - 1 - back
    if (idx >= 0 && idx < days) counts[idx]++
  }
  return counts
}
