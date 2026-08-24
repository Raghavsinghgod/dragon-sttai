import "fake-indexeddb/auto"
import { beforeEach, describe, expect, it } from "vitest"
import { addEntry, deleteEntry, listEntries, type historyEntry } from "./db"

async function clearAll(): Promise<void> {
  for (const e of await listEntries()) {
    if (e.id !== undefined) await deleteEntry(e.id)
  }
}

function entry(partial: Partial<historyEntry>): historyEntry {
  return {
    text: "",
    duration: 1,
    createdAt: 0,
    modelVer: "dragon-stt int8 v0.1.0",
    ...partial,
  }
}

beforeEach(clearAll)

describe("addEntry", () => {
  it("assigns auto-incrementing ids and stores fields verbatim", async () => {
    await addEntry(entry({ text: "hello dragon", duration: 2.5, createdAt: 100 }))
    const all = await listEntries()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBeDefined()
    expect(all[0].text).toBe("hello dragon")
    expect(all[0].duration).toBe(2.5)
    expect(all[0].createdAt).toBe(100)
    expect(all[0].modelVer).toBe("dragon-stt int8 v0.1.0")
  })

  it("persists empty and non-ascii text", async () => {
    await addEntry(entry({ text: "" }))
    await addEntry(entry({ text: "café über — dragon" }))
    const all = await listEntries()
    expect(all.map((e) => e.text).sort()).toEqual(["", "café über — dragon"])
  })
})

describe("listEntries", () => {
  it("returns rows newest first regardless of insertion order", async () => {
    await addEntry(entry({ text: "old", createdAt: 100 }))
    await addEntry(entry({ text: "newest", createdAt: 300 }))
    await addEntry(entry({ text: "middle", createdAt: 200 }))
    const all = await listEntries()
    expect(all.map((e) => e.createdAt)).toEqual([300, 200, 100])
    expect(all.map((e) => e.text)).toEqual(["newest", "middle", "old"])
  })

  it("reflects deletions on subsequent reads", async () => {
    await addEntry(entry({ text: "gone soon", createdAt: 5 }))
    const [row] = await listEntries()
    await deleteEntry(row.id!)
    expect(await listEntries()).toEqual([])
  })
})

describe("deleteEntry", () => {
  it("removes only the targeted row", async () => {
    await addEntry(entry({ text: "keep", createdAt: 1 }))
    await addEntry(entry({ text: "drop", createdAt: 2 }))
    const all = await listEntries()
    const target = all.find((e) => e.text === "drop")
    await deleteEntry(target!.id!)
    const rest = await listEntries()
    expect(rest).toHaveLength(1)
    expect(rest[0].text).toBe("keep")
  })

  it("is a no-op for unknown ids", async () => {
    await addEntry(entry({ text: "safe" }))
    await deleteEntry(999999)
    expect(await listEntries()).toHaveLength(1)
  })
})
