import { describe, expect, it } from "vitest"
import { dailyCounts } from "./chart"

function daysAgo(n: number, hour = 12): number {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, 0, 0, 0)
  return d.getTime()
}

describe("dailyCounts", () => {
  it("returns zeroed buckets", () => {
    expect(dailyCounts([], 7)).toEqual(new Array(7).fill(0))
  })

  it("buckets today into the last slot", () => {
    const counts = dailyCounts([Date.now()], 7)
    expect(counts[6]).toBe(1)
    expect(counts.reduce((a, b) => a + b, 0)).toBe(1)
  })

  it("accumulates runs within the same day", () => {
    const counts = dailyCounts([daysAgo(0, 9), daysAgo(0, 21)], 7)
    expect(counts[6]).toBe(2)
  })

  it("lands older runs in earlier slots", () => {
    const counts = dailyCounts([daysAgo(3)], 7)
    expect(counts[3]).toBe(1)
  })

  it("ignores runs beyond the window", () => {
    const counts = dailyCounts([daysAgo(7), daysAgo(40)], 7)
    expect(counts.every((c) => c === 0)).toBe(true)
  })

  it("ignores future timestamps", () => {
    const future = Date.now() + 3 * 86400000
    expect(dailyCounts([future], 7).every((c) => c === 0)).toBe(true)
  })

  it("respects the window length", () => {
    expect(dailyCounts([daysAgo(29)], 30)[0]).toBe(1)
    expect(dailyCounts([daysAgo(29)], 7).every((c) => c === 0)).toBe(true)
  })
})
