import { describe, expect, it } from "vitest"
import { ctcGreedy, packPaddedLogits } from "./decode"
import { vocab } from "./vocab"

const V = vocab.length

function seq(bests: number[], stride = V): Float32Array {
  const out = new Float32Array(bests.length * stride)
  bests.forEach((best, t) => {
    out[t * stride + best] = 1
  })
  return out
}

describe("default fallback vocab", () => {
  it("uses the space character at index zero as blank", () => {
    expect(vocab[0]).toBe(" ")
  })
})

describe("ctcGreedy with default vocab", () => {
  it("returns empty for zero frames", () => {
    expect(ctcGreedy(new Float32Array(V), 0)).toBe("")
  })

  it("returns empty when every frame picks blank", () => {
    expect(ctcGreedy(seq([0, 0, 0]), 3)).toBe("")
  })

  it("maps argmax tokens to characters", () => {
    expect(ctcGreedy(seq([1, 2, 3]), 3)).toBe("abc")
  })

  it("collapses repeated frames into one character", () => {
    expect(ctcGreedy(seq([5, 5, 5]), 3)).toBe(vocab[5])
  })

  it("lets a blank frame reset repeat suppression", () => {
    expect(ctcGreedy(seq([1, 0, 1]), 3)).toBe("aa")
  })

  it("trims leading and trailing blanks", () => {
    expect(ctcGreedy(seq([0, 1, 0]), 3)).toBe("a")
  })

  it("ignores consecutive blanks between characters", () => {
    expect(ctcGreedy(seq([1, 0, 0, 0, 2]), 5)).toBe("ab")
  })

  it("picks the highest scoring token per frame", () => {
    const logits = new Float32Array(V)
    logits[7] = 0.4
    logits[3] = 0.9
    expect(ctcGreedy(logits, 1)).toBe(vocab[3])
  })

  it("prefers the lowest token on exact score ties", () => {
    const logits = new Float32Array(V)
    logits[5] = 0.7
    logits[3] = 0.7
    expect(ctcGreedy(logits, 1)).toBe("c")
  })

  it("decodes a longer utterance without separators", () => {
    const text = seq([
      0, 1, 1, 0, 2, 0,
      0, 0, 15, 16, 16, 0,
      0, 20, 21, 0, 0, 26,
    ])
    expect(ctcGreedy(text, 18)).toBe("aboptuz")
  })
})

describe("packPaddedLogits", () => {
  it("compacts padded strides down to vocab width", () => {
    const padded = Float32Array.from([1, 2, 3, 90, 91, 4, 5, 6, 92, 93])
    expect([...packPaddedLogits(padded, 2, 5, 3)]).toEqual([1, 2, 3, 4, 5, 6])
  })

  it("returns an empty array for zero frames", () => {
    expect(packPaddedLogits(new Float32Array(16), 0, 4, 4)).toHaveLength(0)
  })

  it("is identity when stride already equals vocab width", () => {
    const packed = seq([1, 2, 0, 3])
    expect([...packPaddedLogits(packed, 4, V, V)]).toEqual([...packed])
  })

  it("feeds ctcGreedy identically to pre-packed logits", () => {
    const packed = seq([1, 2, 0, 3])
    expect(ctcGreedy(packPaddedLogits(packed, 4, V, V), 4)).toBe(ctcGreedy(packed, 4))
  })
})

describe("ctcGreedy with exported vocab layout", () => {
  it("treats the empty string as blank and emits real spaces", () => {
    const original = [...vocab]
    try {
      vocab.length = 0
      vocab.push("", "a", "b", " ")
      const text = seq([1, 2, 0, 0, 3, 1, 2, 3, 0, 3, 1, 2], 4)
      expect(ctcGreedy(text, 12)).toBe("ab ab ab")
    } finally {
      vocab.length = 0
      vocab.push(...original)
    }
  })
})
