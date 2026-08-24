import "fake-indexeddb/auto"
import { beforeEach, describe, expect, it } from "vitest"
import { clearModel, getStoredVocab, getWeights, parseVocab, saveVocab, saveWeights } from "./modelStore"

beforeEach(async () => {
  await clearModel()
})

describe("weights", () => {
  it("returns null when nothing installed", async () => {
    expect(await getWeights()).toBeNull()
  })

  it("round-trips bytes with source and timestamp", async () => {
    const bytes = new TextEncoder().encode("fake onnx weights").buffer
    await saveWeights(bytes, "https://example.com/dragon-stt.onnx")
    const rec = await getWeights()
    expect(rec).not.toBeNull()
    expect(rec!.source).toBe("https://example.com/dragon-stt.onnx")
    expect(rec!.savedAt).toBeGreaterThan(0)
    expect(new Uint8Array(rec!.bytes)).toEqual(new Uint8Array(bytes))
  })

  it("overwrites a previous install", async () => {
    await saveWeights(new ArrayBuffer(4), "first")
    await saveWeights(new ArrayBuffer(8), "second")
    const rec = await getWeights()
    expect(rec!.source).toBe("second")
    expect(rec!.bytes.byteLength).toBe(8)
  })
})

describe("vocab", () => {
  it("round-trips a stored vocab", async () => {
    await saveVocab(["", "a", "b"])
    expect(await getStoredVocab()).toEqual(["", "a", "b"])
  })

  it("returns null when no vocab stored", async () => {
    expect(await getStoredVocab()).toBeNull()
  })
})

describe("clearModel", () => {
  it("removes weights and vocab together", async () => {
    await saveWeights(new ArrayBuffer(2), "src")
    await saveVocab(["", "x"])
    await clearModel()
    expect(await getWeights()).toBeNull()
    expect(await getStoredVocab()).toBeNull()
  })
})

describe("parseVocab", () => {
  it("accepts a valid blank-first vocab", () => {
    expect(parseVocab('["","a","b"]')).toEqual(["", "a", "b"])
  })

  it("rejects invalid json", () => {
    expect(parseVocab("nope")).toBeNull()
  })

  it("rejects non-arrays", () => {
    expect(parseVocab('{"a":1}')).toBeNull()
  })

  it("rejects non-string entries", () => {
    expect(parseVocab('["","a",3]')).toBeNull()
  })

  it("rejects vocabs without a blank token", () => {
    expect(parseVocab('["a","b"]')).toBeNull()
  })
})
