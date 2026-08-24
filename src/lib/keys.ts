export type apiKey = {
  id: string
  name: string
  secret: string
  createdAt: number
  revoked: boolean
}

const storageKey = "dragon-stt-keys"

function readKeys(): apiKey[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as apiKey[]
    return Array.isArray(parsed) ? parsed : []
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
  return `${secret.slice(0, 17)}…${secret.slice(-4)}`
}
