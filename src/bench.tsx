import { useRef, useState } from "react"
import { Copy, Play, Square, Upload } from "@/icons"
import { toast } from "sonner"
import { Button, Card, CardContent, Input } from "@/ui"
import { blobToPcm, transcribe, cer, wer } from "@/stt/engine"

type benchItem = {
  label: string
  text?: string
  load: () => Promise<Blob>
}

type resultRow = {
  label: string
  ref: string | null
  hyp: string
  werVal: number | null
  cerVal: number | null
  dur: number
  ms: number
  failed: boolean
}

const manifestKey = "dragon-stt-bench-manifest"

function nameFromUrl(u: string): string {
  try {
    const parts = new URL(u).pathname.split("/").filter(Boolean)
    return decodeURIComponent(parts[parts.length - 1] ?? u)
  } catch {
    return u
  }
}

function parseManifest(json: unknown): benchItem[] | null {
  if (!json || typeof json !== "object") return null
  const samples = (json as { samples?: unknown }).samples
  if (!Array.isArray(samples)) return null
  const items: benchItem[] = []
  for (const s of samples) {
    if (!s || typeof s !== "object") continue
    const spec = s as { url?: unknown; text?: unknown }
    if (typeof spec.url !== "string") continue
    items.push({
      label: nameFromUrl(spec.url),
      text: typeof spec.text === "string" ? spec.text : undefined,
      load: async () => {
        const res = await fetch(spec.url as string, { signal: AbortSignal.timeout(30000) })
        if (!res.ok) throw new Error(`fetch failed ${res.status}`)
        return res.blob()
      },
    })
  }
  return items.length ? items : null
}

function readSavedManifest(): string {
  try {
    return localStorage.getItem(manifestKey) ?? ""
  } catch {
    return ""
  }
}

function rememberManifest(url: string): void {
  try {
    localStorage.setItem(manifestKey, url)
  } catch {
    return
  }
}

export function Bench() {
  const [manifestUrl, setManifestUrl] = useState(readSavedManifest)
  const [items, setItems] = useState<benchItem[] | null>(null)
  const [loadingManifest, setLoadingManifest] = useState(false)
  const [running, setRunning] = useState(false)
  const [rows, setRows] = useState<resultRow[]>([])
  const [wallMs, setWallMs] = useState(0)
  const filesInput = useRef<HTMLInputElement>(null)
  const stopRef = useRef(false)

  async function loadManifest() {
    const target = manifestUrl.trim()
    if (!target) {
      toast.error("enter a manifest url first")
      return
    }
    setLoadingManifest(true)
    try {
      const res = await fetch(target, { signal: AbortSignal.timeout(30000) })
      if (!res.ok) throw new Error("bad status")
      const parsed = parseManifest(await res.json())
      if (!parsed) throw new Error("bad shape")
      setItems(parsed)
      setRows([])
      rememberManifest(target)
      toast.success(`${parsed.length} samples loaded`)
    } catch {
      toast.error("could not load manifest · check url and cors headers")
    } finally {
      setLoadingManifest(false)
    }
  }

  function addFiles(files: FileList | null) {
    if (!files || !files.length) return
    const added: benchItem[] = Array.from(files).map((f) => ({
      label: f.name,
      load: () => Promise.resolve(f),
    }))
    setItems((prev) => [...(prev ?? []), ...added])
    setRows([])
    toast.success(`${added.length} local files added`)
  }

  async function run() {
    if (!items || running) return
    stopRef.current = false
    setRunning(true)
    setRows([])
    const acc: resultRow[] = []
    const t0 = performance.now()
    for (const item of items) {
      if (stopRef.current) break
      const base: resultRow = {
        label: item.label,
        ref: item.text ?? null,
        hyp: "",
        werVal: null,
        cerVal: null,
        dur: 0,
        ms: 0,
        failed: true,
      }
      try {
        const blob = await item.load()
        const { pcm, duration } = await blobToPcm(blob)
        const s0 = performance.now()
        const { text } = await transcribe(pcm, () => {})
        const ms = performance.now() - s0
        acc.push({
          ...base,
          hyp: text,
          dur: duration,
          ms,
          werVal: item.text !== undefined ? wer(text, item.text) : null,
          cerVal: item.text !== undefined ? cer(text, item.text) : null,
          failed: false,
        })
      } catch {
        acc.push(base)
      }
      setRows([...acc])
    }
    setWallMs(performance.now() - t0)
    setRunning(false)
  }

  const scored = rows.filter((r) => r.werVal !== null)
  const meanOf = (vals: number[]) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null)
  const meanWer = meanOf(scored.map((r) => r.werVal as number))
  const meanCer = meanOf(rows.filter((r) => r.cerVal !== null).map((r) => r.cerVal as number))
  const audioSec = rows.reduce((a, r) => a + r.dur, 0)
  const inferMs = rows.reduce((a, r) => a + r.ms, 0)
  const rtf = audioSec > 0 && inferMs > 0 ? inferMs / 1000 / audioSec : null

  function copySummary() {
    const lines = [
      `dragon-stt evaluation · ${scored.length}/${rows.length} scored`,
      meanWer !== null
        ? `mean wer ${(meanWer * 100).toFixed(1)}%${
            meanCer !== null ? ` · mean cer ${(meanCer * 100).toFixed(1)}%` : ""
          }`
        : "no references scored",
      `audio ${audioSec.toFixed(1)}s · inference ${Math.round(inferMs)}ms${
        rtf !== null ? ` · rtf ${rtf.toFixed(2)}` : ""
      }`,
      "",
      ...rows.map((r) =>
        r.failed
          ? `${r.label}\tFAILED`
          : `${r.label}\twer ${
              r.werVal !== null ? (r.werVal * 100).toFixed(1) + "%" : "-"
            }\thyp: ${r.hyp}${r.ref ? `\tref: ${r.ref}` : ""}`,
      ),
    ]
    navigator.clipboard.writeText(lines.join("\n")).then(
      () => toast.success("summary copied"),
      () => toast.error("clipboard blocked"),
    )
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold tracking-tight">evaluate</h2>
      <Card className="mt-3 border-border/60">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row">
            <Input
              value={manifestUrl}
              onChange={(e) => setManifestUrl(e.target.value)}
              placeholder="https://your-host/dragon-samples.json"
              className="font-mono text-xs"
            />
            <Button
              onClick={loadManifest}
              disabled={loadingManifest || running}
              className="lg:w-32 shrink-0"
            >
              {loadingManifest ? "loading..." : "load samples"}
            </Button>
            <input
              ref={filesInput}
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.flac,.ogg,.webm"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ""
              }}
            />
            <Button
              variant="outline"
              onClick={() => filesInput.current?.click()}
              disabled={running}
              className="gap-2 shrink-0"
            >
              <Upload className="size-4" />
              local files
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {`manifest format: {"samples": [{"url": "clip.wav", "text": "expected transcript"}]}. clips are downloaded once, then decoded and transcribed entirely on device against the currently installed model; hosts must send cors headers. local files skip scoring.`}
          </p>

          {items && items.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
              {!running ? (
                <Button onClick={run} className="gap-2">
                  <Play className="size-4" />
                  run {items.length} sample{items.length === 1 ? "" : "s"}
                </Button>
              ) : (
                <Button variant="destructive" onClick={() => (stopRef.current = true)} className="gap-2">
                  <Square className="size-4" />
                  stop
                </Button>
              )}
              <span className="font-mono text-xs text-muted-foreground">
                {running ? `${rows.length}/${items.length}` : `${items.length} queued`}
              </span>
              {rows.length > 0 && !running && (
                <Button variant="outline" size="sm" onClick={copySummary} className="ml-auto gap-2">
                  <Copy className="size-4" />
                  copy summary
                </Button>
              )}
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-md border border-border/60 px-3 py-2 font-mono text-xs">
                <span>
                  scored {scored.length}/{rows.length}
                </span>
                {meanWer !== null && <span>mean wer {(meanWer * 100).toFixed(1)}%</span>}
                {meanCer !== null && <span>mean cer {(meanCer * 100).toFixed(1)}%</span>}
                <span>audio {audioSec.toFixed(1)}s</span>
                <span>inference {Math.round(inferMs)}ms</span>
                {wallMs > 0 && !running && <span>wall {(wallMs / 1000).toFixed(1)}s</span>}
                {rtf !== null && <span>rtf {rtf.toFixed(2)}</span>}
              </div>
              <div className="max-h-80 divide-y divide-border/60 overflow-y-auto rounded-md border border-border/60">
                {rows.map((r) => (
                  <div key={`${r.label}-${r.ms}`} className="space-y-1 px-3 py-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-mono text-xs">{r.label}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {r.failed
                          ? "failed"
                          : [
                              r.werVal !== null ? `wer ${(r.werVal * 100).toFixed(1)}%` : null,
                              r.dur > 0 ? `${r.dur.toFixed(1)}s` : null,
                              r.ms > 0 ? `${Math.round(r.ms)}ms` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                      </span>
                    </div>
                    {r.ref && (
                      <p className="truncate text-xs text-muted-foreground">
                        ref <span className="text-foreground/70">{r.ref}</span>
                      </p>
                    )}
                    {!r.failed && (
                      <p className="truncate text-xs">
                        hyp <span className="text-primary">{r.hyp}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
