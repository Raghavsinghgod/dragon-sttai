export async function blobToPcm(
  blob: Blob,
  makeCtx: () => AudioContext = () => new AudioContext(),
  Ctx?: typeof OfflineAudioContext,
): Promise<{ pcm: Float32Array; duration: number }> {
  const buf = await blob.arrayBuffer()
  const ctx = makeCtx()
  const decoded = await ctx.decodeAudioData(buf.slice(0))
  await ctx.close()
  return resampleToMono(decoded, Ctx)
}

export async function resampleToMono(
  buffer: AudioBuffer,
  Ctx: typeof OfflineAudioContext = globalThis.OfflineAudioContext,
): Promise<{ pcm: Float32Array; duration: number }> {
  const target = 16000
  const channels = buffer.numberOfChannels
  const monoLen = buffer.length * channels
  const mono = new Float32Array(monoLen)
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c)
    mono.set(data, c * buffer.length)
  }
  if (buffer.sampleRate === target && channels === 1) {
    return { pcm: mono.slice(0, buffer.length), duration: buffer.duration }
  }
  const offline = new Ctx(1, Math.ceil(buffer.duration * target), target)
  const src = offline.createBufferSource()
  const merged = offline.createBuffer(1, monoLen, buffer.sampleRate)
  merged.copyToChannel(mono, 0)
  src.buffer = merged
  src.connect(offline.destination)
  src.start()
  const rendered = await offline.startRendering()
  return { pcm: rendered.getChannelData(0).slice(), duration: rendered.duration }
}

export function normalizePcm(pcm: Float32Array): Float32Array {
  const out = new Float32Array(pcm.length)
  if (!pcm.length) return out
  let sum = 0
  for (let i = 0; i < pcm.length; i++) sum += pcm[i]
  const mean = sum / pcm.length
  let varSum = 0
  for (let i = 0; i < pcm.length; i++) {
    const d = pcm[i] - mean
    varSum += d * d
  }
  const std = Math.sqrt(varSum / pcm.length) || 1
  for (let i = 0; i < pcm.length; i++) out[i] = (pcm[i] - mean) / std
  return out
}
