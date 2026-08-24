import { describe, expect, it } from "vitest"
import { frameEnergies, mockDecode, mockWord, mockWords, voicedRuns } from "./mock"

function featsFrom(levels: number[]): Float32Array {
  const f = new Float32Array(Math.max(levels.length, 1) * 80)
  levels.forEach((v, t) => {
    f[t * 80] = v
  })
  return f
}

describe("frameEnergies", () => {
  it("sums the 80 mel bins per frame", () => {
    const f = new Float32Array(160)
    f[0] = 1
    f[80] = 2
    f[95] = 3
    expect([...frameEnergies(f, 2)]).toEqual([1, 5])
  })

  it("returns no frames for empty input", () => {
    expect(frameEnergies(new Float32Array(80), 0)).toHaveLength(0)
  })
})

describe("voicedRuns", () => {
  it("finds half-open runs strictly above the floor", () => {
    const e = Float32Array.from([0, 5, 6, 7, 0, 8, 9])
    expect(voicedRuns(e, 2)).toEqual([
      [1, 4],
      [5, 7],
    ])
  })

  it("keeps everything when the floor sits below all values", () => {
    expect(voicedRuns(Float32Array.from([1, 1, 1]), 0)).toEqual([[0, 3]])
  })

  it("drops a trailing run that never closes", () => {
    const e = Float32Array.from([9, 9, 9])
    expect(voicedRuns(e, 2)).toEqual([[0, 3]])
  })
})

describe("mockWord", () => {
  it("is stable for identical windows", () => {
    const f = featsFrom(Array(10).fill(3))
    expect(mockWord(f, 0, 10)).toBe(mockWord(f, 0, 10))
  })

  it("always resolves into the mock lexicon", () => {
    for (let end = 4; end <= 40; end += 6) {
      const word = mockWord(featsFrom(Array(end).fill(2)), 0, end)
      expect(mockWords).toContain(word)
    }
  })
})

describe("mockDecode", () => {
  it("returns nothing for silence", () => {
    expect(mockDecode(new Float32Array(20 * 80), 20)).toBe("")
  })

  it("drops bursts shorter than four frames", () => {
    const levels = [...Array(3).fill(10), ...Array(17).fill(1)]
    expect(mockDecode(featsFrom(levels), levels.length)).toBe("")
  })

  it("emits one word per sustained burst", () => {
    const levels = [...Array(10).fill(10), ...Array(6).fill(0), ...Array(12).fill(8)]
    const out = mockDecode(featsFrom(levels), levels.length)
    const words = out.split(" ")
    expect(words).toHaveLength(2)
    words.forEach((word) => expect(mockWords).toContain(word))
  })

  it("collapses a fully voiced clip into one lexicon word", () => {
    const out = mockDecode(featsFrom(Array(30).fill(6)), 30)
    expect(out).not.toBe("")
    expect(mockWords).toContain(out)
  })

  it("is deterministic for identical input", () => {
    const f = featsFrom(Array(30).fill(5))
    expect(mockDecode(f, 30)).toBe(mockDecode(f, 30))
  })
})
