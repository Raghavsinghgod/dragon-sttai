import { useRef, useState } from "react"
import { Mic, Play } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Waveform } from "@/components/waveform"
import { Shell } from "@/components/shell"
import { blobToPcm } from "@/stt/audio"
import { transcribe } from "@/stt/engine"
import { addEntry } from "@/lib/db"
import { getProfile, setProfile } from "@/lib/profile"
import { recordKeyUse } from "@/lib/keys"

const stages = ["decoding audio", "extracting features", "running dragon stt", "done"]

export default function Studio() {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [pcm, setPcm] = useState<Float32Array | null>(null)
  const [stage, setStage] = useState<string>("idle")
  const [result, setResult] = useState<{ text: string; modelVer: string; duration: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [profileName, setProfileName] = useState(getProfile())

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const src = ctx.createMediaStreamSource(stream)
      const node = ctx.createAnalyser()
      node.fftSize = 2048
      src.connect(node)
      setAnalyser(node)
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        await ctx.close()
        setAnalyser(null)
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        await loadBlob(blob)
      }
      recorder.start()
      recorderRef.current = recorder
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
      setRecording(true)
      setResult(null)
    } catch {
      toast.error("microphone unavailable")
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    recorderRef.current?.stop()
    recorderRef.current = null
    setRecording(false)
    setStage("decoding audio")
  }

  async function loadBlob(blob: Blob) {
    setBusy(true)
    setStage("decoding audio")
    try {
      const { pcm: data, duration } = await blobToPcm(blob)
      setPcm(data)
      setStage("idle")
      if (duration < 0.3) toast.error("audio too short")
    } catch {
      toast.error("could not decode audio")
      setStage("error")
    } finally {
      setBusy(false)
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)
    await loadBlob(file)
    e.target.value = ""
  }

  async function runTranscribe() {
    if (!pcm || busy) return
    setBusy(true)
    setResult(null)
    try {
      const out = await transcribe(pcm, setStage)
      setResult({ ...out, duration: pcm.length / 16000 })
      await addEntry({
        text: out.text,
        duration: pcm.length / 16000,
        createdAt: Date.now(),
        modelVer: out.modelVer,
      })
      recordKeyUse()
      toast.success("saved to history")
    } catch {
      toast.error("transcription failed")
      setStage("error")
    } finally {
      setBusy(false)
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success("copied"),
      () => toast.error("copy failed"),
    )
  }

  function exportTxt() {
    if (!result) return
    const blob = new Blob([result.text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "dragon-stt.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  function fmt(s: number): string {
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`
  }

  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight">studio</h1>
      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        <span>profile</span>
        <Input
          value={profileName}
          onChange={(e) => {
            setProfileName(e.target.value)
            setProfile(e.target.value)
          }}
          placeholder="local only"
          className="w-40 h-8"
        />
      </div>

      <Card className="mt-6 border-border/60">
        <CardContent className="pt-6 space-y-4">
          <Waveform analyser={analyser} pcm={pcm} active={recording} />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {recording ? (
              <Button variant="destructive" onClick={stopRecording} className="gap-2">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-white" />
                </span>
                stop ({fmt(elapsed)})
              </Button>
            ) : (
              <Button onClick={startRecording} disabled={busy} className="gap-2">
                <Mic className="size-4" />
                record
              </Button>
            )}
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
              upload audio
              <input type="file" accept="audio/*" onChange={onUpload} className="hidden" />
            </label>
            <Button onClick={runTranscribe} disabled={!pcm || busy || recording} className="gap-2">
              <Play className="size-4" />
              transcribe
            </Button>
          </div>
          <div className="text-xs font-mono">
            {stage === "idle" ? (
              pcm ? (
                <span className="text-muted-foreground">
                  loaded {(pcm.length / 16000).toFixed(1)}s · ready
                </span>
              ) : (
                <span className="text-muted-foreground">no audio yet</span>
              )
            ) : stage === "done" ? (
              <span className="text-primary">done</span>
            ) : stage === "error" ? (
              <span className="text-destructive">failed</span>
            ) : (
              stages.slice(0, stages.indexOf(stage) + 1).map((s, i, arr) => (
                <span key={s} className={i === arr.length - 1 ? "text-primary" : "text-muted-foreground"}>
                  {s}
                  {i < arr.length - 1 ? " -> " : ""}
                </span>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="mt-6 border-border/60">
          <CardContent className="pt-6 space-y-4">
            <p className="whitespace-pre-wrap min-h-12">{result.text}</p>
            <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-muted-foreground">
              <span>
                {result.duration.toFixed(1)}s · {result.modelVer}
              </span>
              <span className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => copyText(result.text)}>
                  copy
                </Button>
                <Button size="sm" variant="secondary" onClick={exportTxt}>
                  export .txt
                </Button>
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </Shell>
  )
}
