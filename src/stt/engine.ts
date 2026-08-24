import * as ort from "onnxruntime-web"
import { frameCount, logMelFrame } from "./features"
import { ctcGreedy, packPaddedLogits } from "./decode"
import { mockDecode } from "./mock"
import { vocab } from "./vocab"
import { getStoredVocab, getWeights } from "../lib/modelStore"
import { normalizePcm } from "./audio"

export const modelCard = {
  name: "dragon-stt",
  params: "95m",
  sizeMb: 90.9,
  quant: "int8 dynamic",
  vocabSize: vocab.length,
  base: "wav2vec2-base-960h · apache-2.0",
}

export type engineState = "cold" | "loading" | "ready" | "mock"
export type engineSource = "stored" | "bundled" | "mock"

let session: ort.InferenceSession | null = null
let state: engineState = "cold"
let source: engineSource = "mock"
let rawMode = false
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

export function getEngineSource(): engineSource {
  return source
}

export async function resetEngine(): Promise<void> {
  if (session) await session.release().catch(() => undefined)
  session = null
  source = "mock"
  rawMode = false
  setState("cold")
}

const sessionOpts = {
  executionProviders: ["wasm"] as string[],
  graphOptimizationLevel: "all" as const,
}

export async function loadEngine(): Promise<engineState> {
  if (state !== "cold") return state
  await loadVocab()
  setState("loading")
  const stored = await getWeights()
  if (stored) {
    try {
      session = await ort.InferenceSession.create(new Uint8Array(stored.bytes), sessionOpts)
      source = "stored"
      rawMode = session.inputNames[0] === "input_values"
      setState("ready")
      return state
    } catch {
      session = null
    }
  }
  if (!(await weightsExist())) {
    setState("mock")
    return state
  }
  try {
    session = await ort.InferenceSession.create("/models/dragon-stt.onnx", sessionOpts)
    source = "bundled"
    rawMode = session.inputNames[0] === "input_values"
    setState("ready")
  } catch {
    setState("mock")
  }
  return state
}

async function loadVocab(): Promise<void> {
  const storedChars = await getStoredVocab()
  if (storedChars) {
    vocab.length = 0
    vocab.push(...storedChars)
    modelCard.vocabSize = storedChars.length
    return
  }
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
    const flat = packPaddedLogits(logits, framesInSlice, stride, vocab.length)
    text += ctcGreedy(flat, framesInSlice) + " "
    await yieldToUi()
  }
  return text.trim().replace(/\s+/g, " ")
}

const rawChunkSamples = 16000 * 25

async function runRaw(pcm: Float32Array): Promise<string> {
  const normed = normalizePcm(pcm)
  const inputName = session!.inputNames[0]
  const outputName = session!.outputNames[0]
  let text = ""
  for (let start = 0; start < normed.length; start += rawChunkSamples) {
    const slice = normed.slice(start, Math.min(start + rawChunkSamples, normed.length))
    const input = new ort.Tensor("float32", slice, [1, slice.length])
    const out = await session!.run({ [inputName]: input })
    const logits = out[outputName].data as Float32Array
    const dims = out[outputName].dims as number[]
    const framesInSlice = dims[1]
    const stride = dims[2]
    const flat = packPaddedLogits(logits, framesInSlice, stride, vocab.length)
    text += ctcGreedy(flat, framesInSlice) + " "
    await yieldToUi()
  }
  return text.trim().replace(/\s+/g, " ")
}

export async function warmup(): Promise<void> {
  if (state === "cold") await loadEngine()
  const seconds = 0.5
  const pcm = new Float32Array(Math.round(seconds * 16000))
  if (session && rawMode) {
    await runRaw(pcm)
    return
  }
  const { feats, nFrames } = await extractFeatures(pcm)
  if (session) await runModel(feats, nFrames)
  else mockDecode(feats, nFrames)
}

export async function transcribe(
  pcm: Float32Array,
  onStage: (stage: string) => void,
): Promise<{ text: string; modelVer: string }> {
  if (state === "cold") await loadEngine()
  if (session && rawMode) {
    onStage("running dragon stt")
    await yieldToUi()
    const text = await runRaw(pcm)
    onStage("done")
    return { text: text || "(silence)", modelVer: "dragon-stt wav2vec2 int8 v1.0.0" }
  }
  onStage("extracting features")
  const { feats, nFrames } = await extractFeatures(pcm)
  onStage("running dragon stt")
  await yieldToUi()
  let text: string
  if (session) text = await runModel(feats, nFrames)
  else text = mockDecode(feats, nFrames)
  onStage("done")
  return { text: text || "(silence)", modelVer: session ? "dragon-stt int8 v1.0.0" : "dragon-stt mock v0.1.0" }
}
