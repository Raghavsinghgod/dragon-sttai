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

export function mockDecode(feats: Float32Array, nFrames: number): string {
  const e = frameEnergies(feats, nFrames)
  let maxE = 0
  for (let t = 0; t < nFrames; t++) if (e[t] > maxE) maxE = e[t]
  const words: string[] = []
  for (const [start, end] of voicedRuns(e, maxE * 0.45)) {
    if (end - start >= 4) words.push(mockWord(feats, start, end))
  }
  return words.join(" ")
}
