import { beforeEach, describe, expect, it } from "vitest"
import {
  createKey,
  deleteKey,
  getActiveKeyId,
  listKeys,
  maskSecret,
  recordKeyUse,
  setActiveKey,
  setRevoked,
} from "./keys"

function byId(id: string) {
  return listKeys().find((k) => k.id === id)
}

beforeEach(() => {
  localStorage.clear()
})

describe("createKey", () => {
  it("mints a prefixed secret with defaults", () => {
    const key = createKey("jarvis voice loop")
    expect(key.name).toBe("jarvis voice loop")
    expect(key.secret.startsWith("dragon_live_")).toBe(true)
    expect(key.secret).toHaveLength(44)
    expect(key.revoked).toBe(false)
    expect(key.uses).toBe(0)
    expect(key.lastUsedAt).toBeNull()
    expect(key.runs).toEqual([])
  })

  it("falls back to an unnamed project", () => {
    expect(createKey("   ").name).toBe("unnamed project")
  })

  it("persists newest first", () => {
    createKey("older")
    const newer = createKey("newer")
    expect(listKeys()[0].id).toBe(newer.id)
    expect(listKeys()).toHaveLength(2)
  })

  it("generates unique secrets", () => {
    const a = createKey("a").secret
    const b = createKey("b").secret
    expect(a).not.toBe(b)
  })
})

describe("maskSecret", () => {
  it("keeps the prefix head and last four chars", () => {
    const secret = createKey("k").secret
    expect(maskSecret(secret)).toBe(`${secret.slice(0, 17)}…${secret.slice(-4)}`)
  })
})

describe("revocation", () => {
  it("flips the flag both ways", () => {
    const key = createKey("a")
    setRevoked(key.id, true)
    expect(byId(key.id)?.revoked).toBe(true)
    setRevoked(key.id, false)
    expect(byId(key.id)?.revoked).toBe(false)
  })

  it("deletes the key entirely", () => {
    const key = createKey("a")
    deleteKey(key.id)
    expect(byId(key.id)).toBeUndefined()
    expect(listKeys()).toHaveLength(0)
  })
})

describe("live key attribution", () => {
  it("records uses only against the live key", () => {
    const a = createKey("a")
    const b = createKey("b")
    setActiveKey(a.id)
    recordKeyUse()
    recordKeyUse()
    expect(byId(a.id)?.uses).toBe(2)
    expect(byId(b.id)?.uses).toBe(0)
    expect(byId(a.id)?.lastUsedAt).not.toBeNull()
    expect(byId(a.id)?.runs).toHaveLength(2)
  })

  it("is a no-op without a live key", () => {
    createKey("a")
    recordKeyUse()
    expect(listKeys()[0].uses).toBe(0)
  })

  it("stops attributing once the live key is revoked", () => {
    const key = createKey("a")
    setActiveKey(key.id)
    setRevoked(key.id, true)
    expect(getActiveKeyId()).toBeNull()
    recordKeyUse()
    expect(listKeys()[0].uses).toBe(0)
  })

  it("validates pointer existence after deletion", () => {
    const key = createKey("a")
    setActiveKey(key.id)
    expect(getActiveKeyId()).toBe(key.id)
    deleteKey(key.id)
    expect(getActiveKeyId()).toBeNull()
  })

  it("round-trips clearing the pointer", () => {
    const key = createKey("a")
    setActiveKey(null)
    expect(getActiveKeyId()).toBeNull()
    setActiveKey(key.id)
    expect(getActiveKeyId()).toBe(key.id)
  })
})

describe("legacy migration", () => {
  it("fills counters for keys stored before tracking existed", () => {
    const legacy = [
      {
        id: "x",
        name: "old build",
        secret: "dragon_live_abcdefabcdefabcdef",
        createdAt: 1,
        revoked: false,
      },
    ]
    localStorage.setItem("dragon-stt-keys", JSON.stringify(legacy))
    const [key] = listKeys()
    expect(key.id).toBe("x")
    expect(key.uses).toBe(0)
    expect(key.lastUsedAt).toBeNull()
    expect(key.runs).toEqual([])
  })
})
