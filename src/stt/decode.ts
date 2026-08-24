import { vocab } from "./vocab"

export function ctcGreedy(logits: Float32Array, nFrames: number): string {
  const blank = 0
  let prev = blank
  let out = ""
  for (let t = 0; t < nFrames; t++) {
    let best = 0
    let bestScore = -Infinity
    for (let v = 0; v < vocab.length; v++) {
      const score = logits[t * vocab.length + v]
      if (score > bestScore) {
        bestScore = score
        best = v
      }
    }
    if (best !== blank && best !== prev) out += vocab[best]
    prev = best
  }
  return out.trim().replace(/\s+/g, " ")
}
