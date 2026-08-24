import { describe, expect, it } from "vitest"
import { frameCount, logMelFrame, sampleRate } from "./features"

describe("constants", () => {
  it("targets 16 khz mono", () => {
    expect(sampleRate).toBe(16000)
  })
})

describe("frameCount", () => {
  it.each([
    [0, 0],
    [399, 0],
    [400, 1],
    [401, 1],
    [559, 1],
    [560, 2],
    [1000, 4],
  ])("counts %i samples as %i frames", (pcmLen, expected) => {
    expect(frameCount(pcmLen)).toBe(expected)
  })
})

const FLOOR = Math.log(1e-6)

function silencePcm(len = 1024): Float32Array {
  return new Float32Array(len)
}

function sinePcm(hz: number, start = 0, len = start + 512, amp = 0.9): Float32Array {
  const pcm = new Float32Array(len)
  for (let i = 0; i < len - start; i++) {
    pcm[start + i] = amp * Math.sin((2 * Math.PI * hz * i) / sampleRate)
  }
  return pcm
}

function extract(pcm: Float32Array, start = 0): Float32Array {
  const out = new Float32Array(80).fill(-999)
  logMelFrame(pcm, start, out)
  return out
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

describe("logMelFrame", () => {
  it("writes exactly 80 bins and leaves the rest untouched", () => {
    const out = new Float32Array(160).fill(-999)
    logMelFrame(silencePcm(), 0, out)
    for (let m = 0; m < 80; m++) expect(out[m]).not.toBe(-999)
    for (let m = 80; m < 160; m++) expect(out[m]).toBe(-999)
  })

  it("maps digital silence to the log epsilon floor", () => {
    const out = extract(silencePcm())
    for (let m = 0; m < 80; m++) {
      expect(Math.abs(out[m] - FLOOR)).toBeLessThan(1e-6)
    }
  })

  it("lifts bins above the floor for a real tone", () => {
    const out = extract(sinePcm(500))
    expect(Math.max(...out)).toBeGreaterThan(FLOOR + 1)
  })

  it("concentrates a low tone in lower mel bands", () => {
    const out = extract(sinePcm(500))
    const low = mean([...out.slice(15, 30)])
    const high = mean([...out.slice(70, 80)])
    expect(low).toBeGreaterThan(high)
  })

  it("distinguishes tones by frequency content", () => {
    const lowTone = extract(sinePcm(200))
    const highTone = extract(sinePcm(4000))
    const lowBinsLowTone = mean([...lowTone.slice(0, 20)])
    const lowBinsHighTone = mean([...highTone.slice(0, 20)])
    expect(lowBinsLowTone).toBeGreaterThan(lowBinsHighTone)
  })

  it("honors an arbitrary read offset into the pcm buffer", () => {
    const start = 160
    const offsetOut = extract(sinePcm(500, start), start)
    const headOut = extract(sinePcm(500, 0, 512))
    expect(offsetOut[40]).toBeCloseTo(headOut[40], 6)
  })

  it("does not leak prior frames through reused buffers", () => {
    const hot = extract(sinePcm(500))
    expect(hot.some((v) => v > FLOOR + 1)).toBe(true)
    const cold = extract(silencePcm())
    for (let m = 0; m < 80; m++) {
      expect(Math.abs(cold[m] - FLOOR)).toBeLessThan(1e-6)
    }
  })
})
