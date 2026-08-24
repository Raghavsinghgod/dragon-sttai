import { describe, expect, it } from "vitest"
import { cer, normalizeText, wer } from "./score"

describe("normalizeText", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeText("Hello, World!")).toBe("hello world")
  })

  it("collapses whitespace", () => {
    expect(normalizeText("  a   b\tc\n")).toBe("a b c")
  })

  it("keeps letters digits and unicode words", () => {
    expect(normalizeText("café 42 drågon")).toBe("café 42 drågon")
  })
})

describe("wer", () => {
  it("is zero for identical transcripts", () => {
    expect(wer("the dragon sleeps", "the dragon sleeps")).toBe(0)
  })

  it("ignores case punctuation and spacing", () => {
    expect(wer("The, DRAGON sleeps!", "the dragon sleeps")).toBe(0)
  })

  it("counts substitutions over reference length", () => {
    expect(wer("the cat sleeps", "the dragon sleeps")).toBeCloseTo(1 / 3)
  })

  it("counts insertions", () => {
    expect(wer("the big red cat", "the cat")).toBeCloseTo(2 / 2)
  })

  it("counts deletions", () => {
    expect(wer("the cat", "the big red cat")).toBeCloseTo(2 / 4)
  })

  it("returns 1 for empty hypothesis against nonempty reference", () => {
    expect(wer("", "some words here")).toBe(1)
  })

  it("returns 0 when both sides are empty", () => {
    expect(wer("", "")).toBe(0)
  })
})

describe("cer", () => {
  it("counts character edits over reference length", () => {
    expect(cer("bat", "cat")).toBeCloseTo(1 / 3)
  })

  it("is zero after normalization makes strings equal", () => {
    expect(cer("CAT!", "cat")).toBe(0)
  })

  it("returns 1 for empty hypothesis against nonempty reference", () => {
    expect(cer("", "abc")).toBe(1)
  })
})
