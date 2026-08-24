export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

function levenshtein(a: string[], b: string[]): number {
  const prev = new Array<number>(b.length + 1)
  const cur = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j]
  }
  return prev[b.length]
}

function distanceRate(hyp: string, ref: string, unit: (s: string) => string[]): number {
  const h = unit(normalizeText(hyp))
  const r = unit(normalizeText(ref))
  if (r.length === 0 && h.length === 0) return 0
  if (r.length === 0 || h.length === 0) return 1
  return levenshtein(h, r) / r.length
}

export function wer(hyp: string, ref: string): number {
  return distanceRate(hyp, ref, (s) => s.split(/\s+/))
}

export function cer(hyp: string, ref: string): number {
  return distanceRate(hyp, ref, (s) => [...s])
}
