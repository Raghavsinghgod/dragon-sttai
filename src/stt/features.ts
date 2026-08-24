export const sampleRate = 16000
const fftSize = 512
const winLen = 400
const hop = 160
const nMels = 80

function hamming(n: number): Float32Array {
  const w = new Float32Array(n)
  for (let i = 0; i < n; i++) w[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1))
  return w
}

function hzToMel(hz: number): number {
  return 1127 * Math.log(1 + hz / 700)
}

function melToHz(mel: number): number {
  return 700 * (Math.exp(mel / 1127) - 1)
}

function melFilterbank(): Float32Array[] {
  const nFftBins = fftSize / 2 + 1
  const fMin = 20
  const fMax = (sampleRate / 2) * 0.95
  const mMin = hzToMel(fMin)
  const mMax = hzToMel(fMax)
  const points: number[] = []
  for (let i = 0; i < nMels + 2; i++) {
    const hz = melToHz(mMin + ((mMax - mMin) * i) / (nMels + 1))
    points.push((hz * fftSize) / sampleRate)
  }
  const filters: Float32Array[] = []
  for (let m = 0; m < nMels; m++) {
    const f = new Float32Array(nFftBins)
    const left = points[m]
    const center = points[m + 1]
    const right = points[m + 2]
    for (let k = 0; k < nFftBins; k++) {
      if (k >= left && k <= center && center > left) f[k] = (k - left) / (center - left)
      else if (k > center && k <= right && right > center) f[k] = (right - k) / (right - center)
    }
    filters.push(f)
  }
  return filters
}

let re: Float32Array | null = null
let im: Float32Array | null = null
let rev: Uint32Array | null = null
const twiddleCos: Float32Array[] = []
const twiddleSin: Float32Array[] = []

function initFft() {
  if (re) return
  re = new Float32Array(fftSize)
  im = new Float32Array(fftSize)
  rev = new Uint32Array(fftSize)
  const bits = Math.log2(fftSize)
  for (let i = 0; i < fftSize; i++) {
    let r = 0
    for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b)
    rev![i] = r
  }
  for (let size = 2, s = 0; size <= fftSize; size <<= 1, s++) {
    const half = size >> 1
    const step = (-2 * Math.PI) / size
    const cosT = new Float32Array(half)
    const sinT = new Float32Array(half)
    for (let k = 0; k < half; k++) {
      cosT[k] = Math.cos(step * k)
      sinT[k] = Math.sin(step * k)
    }
    twiddleCos[s] = cosT
    twiddleSin[s] = sinT
  }
}

function fft() {
  initFft()
  const n = fftSize
  for (let i = 0; i < n; i++) {
    const j = rev![i]
    if (j > i) {
      let tmp = re![i]
      re![i] = re![j]
      re![j] = tmp
      tmp = im![i]
      im![i] = im![j]
      im![j] = tmp
    }
  }
  for (let size = 2, s = 0; size <= n; size <<= 1, s++) {
    const half = size >> 1
    const cosTable = twiddleCos[s]
    const sinTable = twiddleSin[s]
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const wr = cosTable[k]
        const wi = sinTable[k]
        const i = start + k
        const j = i + half
        const xr = re![j] * wr - im![j] * wi
        const xi = re![j] * wi + im![j] * wr
        re![j] = re![i] - xr
        im![j] = im![i] - xi
        re![i] += xr
        im![i] += xi
      }
    }
  }
}

const window = hamming(winLen)
const filters = melFilterbank()
const power = new Float32Array(fftSize / 2 + 1)

export function frameCount(pcmLen: number): number {
  if (pcmLen < winLen) return 0
  return Math.floor((pcmLen - winLen) / hop) + 1
}

export function logMelFrame(pcm: Float32Array, start: number, out: Float32Array): void {
  initFft()
  for (let i = 0; i < fftSize; i++) {
    re![i] = i < winLen ? pcm[start + i] * window[i] : 0
    im![i] = 0
  }
  fft()
  const bins = fftSize / 2 + 1
  for (let k = 0; k < bins; k++) power[k] = (re![k] * re![k] + im![k] * im![k]) / fftSize
  for (let m = 0; m < nMels; m++) {
    const f = filters[m]
    let sum = 0
    for (let k = 0; k < bins; k++) sum += f[k] * power[k]
    out[m] = Math.log(sum + 1e-6)
  }
}
