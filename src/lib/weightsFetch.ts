import { resetEngine } from "@/stt/engine"
import { saveWeights } from "./modelStore"

export const remoteWeightsUrl =
  "https://huggingface.co/Xenova/wav2vec2-base-960h/resolve/main/onnx/model_quantized.onnx"

function joinBytes(parts: Uint8Array[], total: number): ArrayBuffer {
  const out = new Uint8Array(total)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out.buffer
}

export async function downloadWeights(
  url: string,
  onPct: (pct: number | null) => void,
): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`status ${res.status}`)
  const total = Number(res.headers.get("content-length")) || 0
  if (res.body && total > 0) {
    const reader = res.body.getReader()
    const parts: Uint8Array[] = []
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      parts.push(value)
      received += value.length
      onPct(Math.round((received / total) * 100))
    }
    onPct(null)
    return joinBytes(parts, received)
  }
  const buf = await res.arrayBuffer()
  onPct(null)
  return buf
}

export async function installWeightsFromUrl(
  url: string,
  onPct: (pct: number | null) => void,
): Promise<number> {
  const bytes = await downloadWeights(url, onPct)
  await saveWeights(bytes, url)
  await resetEngine()
  return bytes.byteLength
}
