export const dayMs = 86400000

export function dailyCounts(timestamps: number[], days: number): number[] {
  const counts = new Array<number>(days).fill(0)
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (const ts of timestamps) {
    const that = new Date(ts)
    that.setHours(0, 0, 0, 0)
    const back = Math.round((base.getTime() - that.getTime()) / dayMs)
    const idx = days - 1 - back
    if (idx >= 0 && idx < days) counts[idx]++
  }
  return counts
}
