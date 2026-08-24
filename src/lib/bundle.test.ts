import { describe, expect, it } from "vitest"
import { bundleText, makeZip } from "./bundle"

async function parseEntries(zip: Blob): Promise<Record<string, string>> {
  const buf = await zip.arrayBuffer()
  const dv = new DataView(buf)
  const bytes = new Uint8Array(buf)
  let eocd = -1
  for (let i = buf.byteLength - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  expect(eocd).toBeGreaterThanOrEqual(0)
  const count = dv.getUint16(eocd + 10, true)
  let off = dv.getUint32(eocd + 16, true)
  const out: Record<string, string> = {}
  for (let i = 0; i < count; i++) {
    expect(dv.getUint32(off, true)).toBe(0x02014b50)
    const method = dv.getUint16(off + 10, true)
    const size = dv.getUint32(off + 24, true)
    const nameLen = dv.getUint16(off + 28, true)
    const localOff = dv.getUint32(off + 42, true)
    const name = new TextDecoder().decode(bytes.subarray(off + 46, off + 46 + nameLen))
    expect(method).toBe(0)
    expect(dv.getUint32(localOff, true)).toBe(0x04034b50)
    const localNameLen = dv.getUint16(localOff + 26, true)
    const dataStart = localOff + 30 + localNameLen
    out[name] = new TextDecoder().decode(bytes.subarray(dataStart, dataStart + size))
    off += 46 + nameLen
  }
  return out
}

describe("makeZip", () => {
  it("stores files with exact content", async () => {
    const parsed = await parseEntries(
      makeZip([
        ["readme.txt", "dragon starter"],
        ["src/stt/engine.ts", "export const x = 1"],
      ]),
    )
    expect(Object.keys(parsed).sort()).toEqual(["readme.txt", "src/stt/engine.ts"])
    expect(parsed["readme.txt"]).toBe("dragon starter")
    expect(parsed["src/stt/engine.ts"]).toBe("export const x = 1")
  })

  it("handles empty and non-ascii content", async () => {
    const parsed = await parseEntries(
      makeZip([
        ["empty.txt", ""],
        ["unicode.txt", "café über"],
      ]),
    )
    expect(parsed["empty.txt"]).toBe("")
    expect(parsed["unicode.txt"]).toBe("café über")
  })

  it("reports matching entry count in the central directory", async () => {
    const zip = makeZip([
      ["a.txt", "a"],
      ["b.txt", "b"],
      ["c/d.txt", "d"],
    ])
    const buf = await zip.arrayBuffer()
    const dv = new DataView(buf)
    let eocd = -1
    for (let i = buf.byteLength - 22; i >= 0; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) {
        eocd = i
        break
      }
    }
    expect(dv.getUint16(eocd + 10, true)).toBe(3)
  })
})

describe("bundleText", () => {
  it("joins files under path markers", () => {
    const text = bundleText([
      ["a.ts", "const a = 1"],
      ["b.ts", "const b = 2"],
    ])
    expect(text).toBe("// === a.ts ===\nconst a = 1\n\n// === b.ts ===\nconst b = 2")
  })

  it("returns an empty string for no files", () => {
    expect(bundleText([])).toBe("")
  })
})
