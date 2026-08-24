import { toast } from "sonner"
import { Copy } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Shell } from "@/components/shell"

const toc = [
  ["layout", "project layout"],
  ["install", "install"],
  ["audio", "audio in"],
  ["transcribe", "transcribe"],
  ["features", "features only"],
  ["reference", "reference"],
  ["keys", "api keys"],
  ["offline", "offline checklist"],
]

const layoutTree = `your-app/
  src/stt/
    audio.ts
    decode.ts
    engine.ts
    features.ts
    vocab.ts
  public/
    ort/
      ort-wasm-simd-threaded.wasm
    models/
      dragon-stt.onnx
      vocab.json`

const installCmd = `bun add onnxruntime-web`

const configureSnippet = `import * as ort from "onnxruntime-web"

ort.env.wasm.wasmPaths = "/ort/"
ort.env.wasm.numThreads = 1`

const audioSnippet = `import { blobToPcm } from "./stt/audio"

const { pcm, duration } = await blobToPcm(audioBlob)
if (duration < 0.3) throw new Error("clip too short")`

const transcribeSnippet = `import { getEngineState, transcribe, warmup } from "./stt/engine"

await warmup()

const { text, modelVer } = await transcribe(pcm, setStage)`

const featuresSnippet = `import { frameCount, logMelFrame } from "./stt/features"

const frames = frameCount(pcm.length)
const feats = new Float32Array(frames * 80)
const row = new Float32Array(80)
for (let t = 0; t < frames; t++) {
  logMelFrame(pcm, t * 160, row)
  feats.set(row, t * 80)
}`

const reference: [string, string, string][] = [
  [
    "blobToPcm",
    "(blob: Blob) => Promise<{ pcm: Float32Array; duration: number }>",
    "decodes any browser-supported audio to mono float32 at 16 khz via offlineaudiocontext resampling",
  ],
  [
    "transcribe",
    "(pcm: Float32Array, onStage: (stage: string) => void) => Promise<{ text: string; modelVer: string }>",
    "full pipeline: log-mel, chunked inference at 800 frames, ctc greedy decode; yields between chunks so the ui never freezes",
  ],
  [
    "warmup",
    "() => Promise<void>",
    "runs a silent 0.5 s pass; call once after load so the first real request is fast",
  ],
  [
    "modelCard",
    "{ name, params, sizeMb, quant, vocabSize }",
    "bundled model metadata for display or telemetry-free diagnostics",
  ],
  [
    "getEngineState",
    '() => "cold" | "loading" | "ready" | "mock"',
    "mock means weights were absent at load time and the deterministic fallback decoder is active",
  ],
  [
    "onEngineState",
    "(fn: (s: engineState) => void) => () => void",
    "subscribe to state changes; the returned function unsubscribes",
  ],
]

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("copied"),
    () => toast.error("copy failed"),
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-lg border border-border/60 bg-card p-4 pr-12 font-mono text-xs leading-relaxed">
        {code}
      </pre>
      <Button
        size="icon"
        variant="ghost"
        title="copy snippet"
        className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        onClick={() => copyText(code)}
      >
        <Copy className="size-3.5" />
      </Button>
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-20">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}

export default function Docs() {
  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight">docs</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        embed guide · ship dragon-stt inside your own app. five source modules, one package,
        zero network at runtime.
      </p>

      <nav className="mt-6 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
        {toc.map(([id, label], i) => (
          <a
            key={id}
            href={`#${id}`}
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            <span className="text-primary">{String(i + 1).padStart(2, "0")}</span> {label}
          </a>
        ))}
      </nav>

      <Section id="layout" title="project layout">
        <p className="text-sm leading-relaxed text-muted-foreground">
          copy the runtime sources and static assets into your app. everything is same-origin:
          wasm from <code className="font-mono">/ort</code>, weights from{" "}
          <code className="font-mono">/models</code>.
        </p>
        <CodeBlock code={layoutTree} />
      </Section>

      <Section id="install" title="install">
        <p className="text-sm leading-relaxed text-muted-foreground">
          onnxruntime-web is the only dependency. no dsp libs, no ml frameworks.
        </p>
        <CodeBlock code={installCmd} />
        <p className="text-sm leading-relaxed text-muted-foreground">
          engine.ts already pins the wasm path and single-thread execution, so this config is only
          needed if you roll your own session.
        </p>
        <CodeBlock code={configureSnippet} />
      </Section>

      <Section id="audio" title="audio in">
        <p className="text-sm leading-relaxed text-muted-foreground">
          feed any blob the browser can decode — mediaRecorder output, uploaded files, websocket
          chunks. it comes back as mono float32 at 16 khz.
        </p>
        <CodeBlock code={audioSnippet} />
      </Section>

      <Section id="transcribe" title="transcribe">
        <p className="text-sm leading-relaxed text-muted-foreground">
          one call runs the whole pipeline. stage callbacks arrive in order: decoding audio,
          extracting features, running dragon stt, done. wire them straight into a status line.
        </p>
        <CodeBlock code={transcribeSnippet} />
        <p className="text-sm leading-relaxed text-muted-foreground">
          long clips never block the ui: features and inference are chunked and yield between
          chunks. check <code className="font-mono">getEngineState()</code> before relying on real
          output — <code className="font-mono">mock</code> means weights were missing.
        </p>
      </Section>

      <Section id="features" title="features only">
        <p className="text-sm leading-relaxed text-muted-foreground">
          want the mel front-end for your own downstream model? it is exported directly. stride is
          160 samples (10 ms), window 400 (25 ms).
        </p>
        <CodeBlock code={featuresSnippet} />
        <p className="text-sm leading-relaxed text-muted-foreground">
          if you retrain the weights yourself, mirror the packing in engine.ts runModel before
          calling <code className="font-mono">ctcGreedy</code> — padded logits must be compacted to
          vocab width first.
        </p>
      </Section>

      <Section id="reference" title="reference">
        <div className="divide-y divide-border/60 border-y border-border/60">
          {reference.map(([name, sig, note]) => (
            <div key={name} className="py-3">
              <p className="font-mono text-sm text-primary">{name}</p>
              <p className="mt-1 font-mono text-xs break-all">{sig}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{note}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="keys" title="api keys">
        <p className="text-sm leading-relaxed text-muted-foreground">
          mint one key per project in the{" "}
          <Link to="/dashboard" className="text-primary hover:underline">
            console
          </Link>{" "}
          and paste it into your app config. keys are local identifiers for your builds — they are
          generated, stored and checked entirely on-device, and they never leave the browser.
        </p>
      </Section>

      <Section id="offline" title="offline checklist">
        <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed text-muted-foreground">
          <li>copy src/stt and public/ort into the host app</li>
          <li>place dragon-stt.onnx and vocab.json under public/models</li>
          <li>keep wasm same-origin at /ort, numThreads 1</li>
          <li>after first load, kill the network: transcription must still work</li>
        </ul>
      </Section>
    </Shell>
  )
}
