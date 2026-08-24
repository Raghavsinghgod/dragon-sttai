import { useEffect, useState } from "react"
import { Flame } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Shell } from "@/components/shell"
import { getEngineState, modelCard, onEngineState, warmup } from "@/stt/engine"

const stateLabel: Record<string, string> = {
  cold: "cold",
  loading: "loading",
  ready: "ready",
  mock: "mock decode",
}

export default function ModelPage() {
  const [state, setState] = useState(getEngineState())
  const [warming, setWarming] = useState(false)

  useEffect(() => onEngineState(setState), [])

  async function runWarmup() {
    setWarming(true)
    try {
      await warmup()
      toast.success("model warm")
    } catch {
      toast.error("warmup failed")
    } finally {
      setWarming(false)
    }
  }

  const rows: [string, string][] = [
    ["name", modelCard.name],
    ["params", modelCard.params],
    ["size", `${modelCard.sizeMb} mb`],
    ["quantization", modelCard.quant],
    ["vocab size", String(modelCard.vocabSize)],
    ["runtime", "onnxruntime-web wasm · 1 thread"],
  ]

  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight">model</h1>
      <Card className="mt-6 border-border/60">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">status</span>
            <span
              className={`inline-flex items-center gap-2 text-sm font-medium ${
                state === "ready" || state === "mock" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  state === "loading"
                    ? "animate-pulse bg-primary"
                    : state === "cold"
                      ? "bg-muted-foreground/50"
                      : "bg-primary"
                }`}
              />
              loaded / {stateLabel[state]}
            </span>
          </div>
          <div className="divide-y divide-border/60 border-t border-border/60">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-mono">{v}</span>
              </div>
            ))}
          </div>
          <Button onClick={runWarmup} disabled={warming} className="gap-2">
            <Flame className={`size-4 ${warming ? "animate-pulse" : ""}`} />
            {warming ? "warming..." : "warmup"}
          </Button>
          <p className="text-xs text-muted-foreground leading-relaxed">
            weights live at /models/dragon-stt.onnx, bundled, never downloaded at runtime. until the
            weights file is present the studio runs a deterministic local mock decoder over the same
            log-mel pipeline.
          </p>
        </CardContent>
      </Card>
    </Shell>
  )
}
