import * as ort from "onnxruntime-web"
import { frameCount, logMelFrame } from "./features"
import { ctcGreedy } from "./decode"
import { vocab } from "./vocab"

export const modelCard = {
  name: "dragon-stt",
  params: "1.8m",
  sizeMb: 4.2,
  quant: "int8",
  vocabSize: vocab.length,
}

export type engineState = "cold" | "loading" | "ready" | "mock"

let session: ort.InferenceSession | null = null
let state: engineState = "cold"
let stateListeners: ((s: engineState) => void)[] = []

function setState(s: engineState) {
  state = s
  stateListeners.forEach((fn) => fn(s))
}

export function getEngineState() {
  return state
}

export function onEngineState(fn: (s: engineState) => void): () => void {
  stateListeners.push(fn)
  return () => {
    stateListeners = stateListeners.filter((f) => f !== fn)
  }
}

ort.env.wasm.wasmPaths = "/ort/"
ort.env.wasm.numThreads = 1

async function weightsExist(): Promise<boolean> {
  try {
    const res = await fetch("/models/dragon-stt.onnx", { method: "HEAD" })
    const type = res.headers.get("content-type") ?? ""
    return res.ok && !type.includes("text/html")
  } catch {
    return false
  }
}

const yieldToUi = () => new Promise<void>((r) => setTimeout(r, 0))

export async function loadEngine(): Promise<engineState> {
  if (state !== "cold") return state
  await loadVocab()
  setState("loading")
  if (!(await weightsExist())) {
    setState("mock")
    return state
  }
  try {
    session = await ort.InferenceSession.create("/models/dragon-stt.onnx", {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    })
    setState("ready")
  } catch {
    setState("mock")
  }
  return state
}

async function loadVocab(): Promise<void> {
  try {
    const res = await fetch("/models/vocab.json")
    if (!res.ok) return
    const chars = (await res.json()) as string[]
    if (!Array.isArray(chars) || !chars.includes("")) return
    vocab.length = 0
    vocab.push(...chars)
    modelCard.vocabSize = chars.length
  } catch {
    return
  }
}

const featureChunk = 500

async function extractFeatures(
  pcm: Float32Array,
): Promise<{ feats: Float32Array; nFrames: number }> {
  const nFrames = frameCount(pcm.length)
  const feats = new Float32Array(nFrames * 80)
  const row = new Float32Array(80)
  for (let t = 0; t < nFrames; t++) {
    logMelFrame(pcm, t * 160, row)
    feats.set(row, t * 80)
    if (t % featureChunk === featureChunk - 1) await yieldToUi()
  }
  return { feats, nFrames }
}

const chunkFrames = 800

async function runModel(feats: Float32Array, nFrames: number): Promise<string> {
  let text = ""
  for (let start = 0; start < nFrames; start += chunkFrames) {
    const end = Math.min(start + chunkFrames, nFrames)
    const slice = feats.slice(start * 80, end * 80)
    const input = new ort.Tensor("float32", slice, [1, end - start, 80])
    const out = await session!.run({ inputs: input })
    const logits = out.logits.data as Float32Array
    const dims = out.logits.dims as number[]
    const framesInSlice = dims[1]
    const stride = dims[2]
    const flat = new Float32Array(framesInSlice * vocab.length)
    for (let t = 0; t < framesInSlice; t++)
      for (let v = 0; v < vocab.length; v++) flat[t * vocab.length + v] = logits[t * stride + v]
    text += ctcGreedy(flat, framesInSlice) + " "
    await yieldToUi()
  }
  return text.trim().replace(/\s+/g, " ")
}

const mockWords = [
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

function mockDecode(feats: Float32Array, nFrames: number): string {
  const energy = new Float32Array(nFrames)
  let maxE = 0
  for (let t = 0; t < nFrames; t++) {
    let sum = 0
    for (let m = 0; m < 80; m++) sum += feats[t * 80 + m]
    energy[t] = sum
    if (sum > maxE) maxE = sum
  }
  const floor = maxE * 0.45
  const words: string[] = []
  let inWord = false
  let start = 0
  for (let t = 0; t <= nFrames; t++) {
    const voiced = t < nFrames && energy[t] > floor
    if (voiced && !inWord) {
      inWord = true
      start = t
    } else if (!voiced && inWord) {
      inWord = false
      const len = t - start
      if (len >= 4) {
        let h = 2166136261
        for (let i = start; i < t; i += 3)
          h = (Math.imul(h ^ Math.round(feats[i * 80] * 997), 16777619) >>> 0) % 100003
        words.push(mockWords[h % mockWords.length])
      }
    }
  }
  return words.join(" ")
}

export async function warmup(): Promise<void> {
  if (state === "cold") await loadEngine()
  const seconds = 0.5
  const pcm = new Float32Array(Math.round(seconds * 16000))
  const { feats, nFrames } = await extractFeatures(pcm)
  if (session) await runModel(feats, nFrames)
  else mockDecode(feats, nFrames)
}

export async function transcribe(
  pcm: Float32Array,
  onStage: (stage: string) => void,
): Promise<{ text: string; modelVer: string }> {
  if (state === "cold") await loadEngine()
  onStage("extracting features")
  const { feats, nFrames } = await extractFeatures(pcm)
  onStage("running dragon stt")
  await yieldToUi()
  let text: string
  if (session) text = await runModel(feats, nFrames)
  else text = mockDecode(feats, nFrames)
  onStage("done")
  return { text: text || "(silence)", modelVer: session ? "dragon-stt int8 v0.1.0" : "dragon-stt mock v0.1.0" }
}
