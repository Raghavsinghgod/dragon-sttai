import { describe, expect, it } from "vitest"
import { blobToPcm, normalizePcm, resampleToMono } from "./audio"

const TARGET = 16000

class SynthBuffer {
  numberOfChannels: number
  length: number
  sampleRate: number
  channels: Float32Array[]

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels
    this.length = length
    this.sampleRate = sampleRate
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length))
  }

  get duration(): number {
    return this.length / this.sampleRate
  }

  getChannelData(c: number): Float32Array {
    return this.channels[c]
  }

  copyToChannel(src: Float32Array, c: number): void {
    this.channels[c].set(src)
  }

  fill(value: number): this {
    this.channels.forEach((ch) => ch.fill(value))
    return this
  }
}

function asAudioBuffer(b: SynthBuffer): AudioBuffer {
  return b as unknown as AudioBuffer
}

function asOfflineCtx(fake: unknown): typeof OfflineAudioContext {
  return fake as unknown as typeof OfflineAudioContext
}

class FakeOffline {
  static renders = 0

  length: number
  sampleRate: number
  private source: { buffer: unknown } | null = null

  constructor(_channels: number, length: number, sampleRate: number) {
    this.length = length
    this.sampleRate = sampleRate
    FakeOffline.renders++
  }

  createBuffer(channels: number, length: number, sampleRate: number): SynthBuffer {
    return new SynthBuffer(channels, length, sampleRate)
  }

  createBufferSource() {
    const src = {
      buffer: null as unknown,
      connect: () => {},
      start: () => {},
    }
    this.source = src
    return src
  }

  startRendering(): Promise<SynthBuffer> {
    const input = this.source?.buffer as SynthBuffer | null
    if (!input) throw new Error("no source buffer")
    const out = new SynthBuffer(1, this.length, this.sampleRate)
    const data = out.getChannelData(0)
    const stream = input.getChannelData(0)
    const ratio = input.sampleRate / this.sampleRate
    for (let i = 0; i < this.length; i++) {
      const pos = i * ratio
      const i0 = Math.floor(pos)
      const frac = pos - i0
      const s0 = stream[i0] ?? 0
      const s1 = stream[i0 + 1] ?? s0
      data[i] = s0 + (s1 - s0) * frac
    }
    return Promise.resolve(out)
  }
}

function throwingCtor(): typeof OfflineAudioContext {
  return function () {
    throw new Error("renderer must not be constructed")
  } as unknown as typeof OfflineAudioContext
}

function allClose(pcm: Float32Array, value: number, eps = 1e-6): boolean {
  return Array.from(pcm).every((v) => Math.abs(v - value) < eps)
}

describe("resampleToMono", () => {
  it("passes 16 khz mono through untouched without constructing a renderer", async () => {
    const buf = new SynthBuffer(1, 1600, TARGET).fill(0.5)
    FakeOffline.renders = 0
    const { pcm, duration } = await resampleToMono(asAudioBuffer(buf), throwingCtor())
    expect(pcm).toHaveLength(1600)
    expect(allClose(pcm, 0.5)).toBe(true)
    expect(duration).toBeCloseTo(0.1, 9)
    expect(FakeOffline.renders).toBe(0)
  })

  it("keeps the first channel for multichannel input at target rate", async () => {
    const buf = new SynthBuffer(2, 800, TARGET)
    buf.getChannelData(0).fill(1)
    buf.getChannelData(1).fill(-1)
    const { pcm, duration } = await resampleToMono(asAudioBuffer(buf), asOfflineCtx(FakeOffline))
    expect(pcm).toHaveLength(800)
    expect(allClose(pcm, 1)).toBe(true)
    expect(duration).toBeCloseTo(0.05, 9)
  })

  it("downsamples constant dc at 44.1 khz to exact length and level", async () => {
    const buf = new SynthBuffer(1, 44100, 44100).fill(0.8)
    const { pcm, duration } = await resampleToMono(asAudioBuffer(buf), asOfflineCtx(FakeOffline))
    expect(pcm).toHaveLength(16000)
    expect(allClose(pcm, 0.8)).toBe(true)
    expect(duration).toBeCloseTo(1, 9)
  })

  it("applies ceiling on fractional target lengths", async () => {
    const buf = new SynthBuffer(1, 2205, 44100).fill(-0.25)
    const { pcm, duration } = await resampleToMono(asAudioBuffer(buf), asOfflineCtx(FakeOffline))
    expect(pcm).toHaveLength(800)
    expect(allClose(pcm, -0.25)).toBe(true)
    expect(duration).toBeCloseTo(0.05, 9)
  })

  it("tracks a moving ramp through interpolation", async () => {
    const buf = new SynthBuffer(1, 8000, 32000)
    for (let i = 0; i < 8000; i++) buf.getChannelData(0)[i] = i / 8000
    const { pcm } = await resampleToMono(asAudioBuffer(buf), asOfflineCtx(FakeOffline))
    expect(pcm).toHaveLength(4000)
    expect(Math.abs(pcm[100] - 0.025)).toBeLessThan(1e-3)
    expect(Math.abs(pcm[2000] - 0.5)).toBeLessThan(1e-3)
    expect(pcm[3999]).toBeGreaterThan(0.99)
  })
})

describe("blobToPcm", () => {
  it("wires a decoded fixture through resampling and closes the context", async () => {
    const fixture = new SynthBuffer(1, 4000, 8000).fill(0.25)
    let closed = false
    const ctx = {
      decodeAudioData: async () => fixture,
      close: async () => {
        closed = true
      },
    } as unknown as AudioContext
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/x-test" })
    const { pcm, duration } = await blobToPcm(blob, () => ctx, asOfflineCtx(FakeOffline))
    expect(pcm).toHaveLength(8000)
    expect(allClose(pcm, 0.25)).toBe(true)
    expect(duration).toBeCloseTo(0.5, 9)
    expect(closed).toBe(true)
  })
})

describe("normalizePcm", () => {
  it("centers mean and scales to unit variance", () => {
    const pcm = new Float32Array([1, 2, 3, 4, 5])
    const out = normalizePcm(pcm)
    let mean = 0
    for (const v of out) mean += v
    mean /= out.length
    let varSum = 0
    for (const v of out) varSum += (v - mean) * (v - mean)
    expect(mean).toBeCloseTo(0, 9)
    expect(Math.sqrt(varSum / out.length)).toBeCloseTo(1, 6)
  })

  it("maps constant input to zeros instead of dividing by zero", () => {
    const out = normalizePcm(new Float32Array(8).fill(0.7))
    expect([...out].every((v) => v === 0)).toBe(true)
  })

  it("returns an empty buffer for empty input", () => {
    expect(normalizePcm(new Float32Array(0))).toHaveLength(0)
  })

  it("preserves length and sign structure of the waveform", () => {
    const pcm = new Float32Array([-2, -1, 1, 2])
    const out = normalizePcm(pcm)
    expect(out).toHaveLength(4)
    expect(out[0]).toBeLessThan(0)
    expect(out[3]).toBeGreaterThan(0)
  })
})
