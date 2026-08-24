export const mockWords = [
  "dragon",
  "local",
  "voice",
  "text",
  "offline",
  "hold",
  "steady",
  "ember",
  "iron",
  "quiet",
]

function energyAt(feats: Float32Array, t: number): number {
  let sum = 0
  for (let m = 0; m < 80; m++) sum += feats[t * 80 + m]
  return sum
}

export function frameEnergies(feats: Float32Array, nFrames: number): Float32Array {
  const out = new Float32Array(nFrames)
  for (let t = 0; t < nFrames; t++) out[t] = energyAt(feats, t)
  return out
}

export function voicedRuns(energies: Float32Array, floor: number): [number, number][] {
  const runs: [number, number][] = []
  let start = -1
  for (let t = 0; t <= energies.length; t++) {
    const voiced = t < energies.length && energies[t] > floor
    if (voiced && start < 0) start = t
    else if (!voiced && start >= 0) {
      runs.push([start, t])
      start = -1
    }
  }
  return runs
}

export function mockWord(feats: Float32Array, start: number, end: number): string {
  let h = 2166136261
  for (let i = start; i < end; i += 3)
    h = (Math.imul(h ^ Math.round(feats[i * 80] * 997), 16777619) >>> 0) % 100003
  return mockWords[h % mockWords.length]
}

export function energyThreshold(e: Float32Array): number {
  if (!e.length) return 0
  const sorted = Float32Array.from(e).sort()
  const p85 = sorted[Math.floor(0.85 * (sorted.length - 1))]
  return p85 * 0.5
}

export function mockDecode(feats: Float32Array, nFrames: number): string {
  const e = frameEnergies(feats, nFrames)
  const words: string[] = []
  for (const [start, end] of voicedRuns(e, energyThreshold(e))) {
    if (end - start >= 4) words.push(mockWord(feats, start, end))
  }
  return words.join(" ")
}
