export const vocab = Array.from(" abcdefghijklmnopqrstuvwxyz'")

export async function loadVocabOverride(): Promise<boolean> {
  try {
    const res = await fetch("/models/vocab.json")
    if (!res.ok) return false
    const chars = (await res.json()) as string[]
    if (!Array.isArray(chars) || !chars.includes("")) return false
    vocab.length = 0
    vocab.push(...chars)
    return true
  } catch {
    return false
  }
}
