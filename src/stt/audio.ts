export async function blobToPcm(blob: Blob): Promise<{ pcm: Float32Array; duration: number }> {
  const buf = await blob.arrayBuffer()
  const ctx = new AudioContext()
  const decoded = await ctx.decodeAudioData(buf.slice(0))
  await ctx.close()
  return resampleToMono(decoded)
}

async function resampleToMono(
  buffer: AudioBuffer,
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
  const offline = new OfflineAudioContext(1, Math.ceil(buffer.duration * target), target)
  const src = offline.createBufferSource()
  const merged = offline.createBuffer(1, monoLen, buffer.sampleRate)
  merged.copyToChannel(mono, 0)
  src.buffer = merged
  src.connect(offline.destination)
  src.start()
  const rendered = await offline.startRendering()
  return { pcm: rendered.getChannelData(0).slice(), duration: rendered.duration }
}
