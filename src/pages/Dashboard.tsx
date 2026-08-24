import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Activity,
  ArrowRight,
  Ban,
  Copy,
  KeyRound,
  Plus,
  RotateCcw,
  Terminal,
  Timer,
  Trash2,
} from "lucide-react"
import { Link } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Shell } from "@/components/shell"
import { listEntries, type historyEntry } from "@/lib/db"
import { getProfile } from "@/lib/profile"
import {
  createKey,
  deleteKey,
  listKeys,
  maskSecret,
  setRevoked,
  type apiKey,
} from "@/lib/keys"

const quickstart = `const { pcm } = await blobToPcm(recorded)
const { text, modelVer } = await transcribe(pcm, (stage) => log(stage))`

function copySecret(secret: string) {
  navigator.clipboard.writeText(secret).then(
    () => toast.success("key copied"),
    () => toast.error("copy failed"),
  )
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString()
}

export default function Dashboard() {
  const [entries, setEntries] = useState<historyEntry[] | null>(null)
  const [keys, setKeys] = useState<apiKey[] | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [revealed, setRevealed] = useState<apiKey | null>(null)

  useEffect(() => {
    listEntries()
      .then(setEntries)
      .catch(() => toast.error("could not load usage"))
    setKeys(listKeys())
  }, [])

  const loaded = entries !== null && keys !== null
  const totalSeconds = entries?.reduce((acc, e) => acc + e.duration, 0) ?? 0
  const activeKeys = keys?.filter((k) => !k.revoked).length ?? 0

  const stats: [string, string, typeof Activity][] = [
    ["transcriptions", loaded ? String(entries!.length) : "", Activity],
    ["audio processed", loaded ? `${(totalSeconds / 60).toFixed(1)} min` : "", Timer],
    ["active keys", loaded ? String(activeKeys) : "", KeyRound],
  ]

  function mint() {
    const key = createKey(newName)
    setKeys(listKeys())
    setCreateOpen(false)
    setNewName("")
    setRevealed(key)
    toast.success("api key minted")
  }

  function toggleRevoke(key: apiKey) {
    setRevoked(key.id, !key.revoked)
    setKeys(listKeys())
    toast.success(key.revoked ? "key restored" : "key revoked")
  }

  function removeKey(id: string) {
    deleteKey(id)
    setKeys(listKeys())
    toast.success("key deleted")
  }

  return (
    <Shell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-semibold tracking-tight">developer console</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          local workspace · signed in as {getProfile() || "anon"} · nothing leaves this device
        </p>
      </motion.div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {stats.map(([label, value, Icon], i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.35 }}
          >
            <Card className="border-border/60">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="size-4" />
                  <span className="text-xs uppercase tracking-widest">{label}</span>
                </div>
                {loaded ? (
                  <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
                ) : (
                  <Skeleton className="mt-2 h-8 w-24" />
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.4 }}>
        <Card className="mt-6 border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">api keys</CardTitle>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              mint key
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              one key per project that embeds the dragon runtime. keys are generated and stored in
              this browser only — they never leave the device.
            </p>
            {keys === null ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : keys.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">no keys yet. mint one for your next build.</p>
            ) : (
              <div className="mt-2 divide-y divide-border/60">
                {keys.map((k) => (
                  <div key={k.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="truncate text-sm font-medium">{k.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{maskSecret(k.secret)}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{fmtDate(k.createdAt)}</span>
                    {k.revoked ? (
                      <Badge variant="outline" className="text-muted-foreground">revoked</Badge>
                    ) : (
                      <Badge className="border border-primary/30 bg-primary/15 text-primary">active</Badge>
                    )}
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="copy full key"
                        onClick={() => copySecret(k.secret)}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title={k.revoked ? "restore key" : "revoke key"}
                        onClick={() => toggleRevoke(k)}
                      >
                        {k.revoked ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="delete key"
                        onClick={() => removeKey(k.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.4 }}>
        <Card className="mt-6 border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="size-4 text-primary" />
              wire it up
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
              <li>
                copy <code className="font-mono text-foreground">src/stt</code> and{" "}
                <code className="font-mono text-foreground">public/ort</code> into your app
              </li>
              <li>
                bundle weights at{" "}
                <code className="font-mono text-foreground">public/models/dragon-stt.onnx</code> with
                vocab.json
              </li>
              <li>call the runtime from anywhere</li>
            </ol>
            <pre className="overflow-x-auto rounded-lg border border-border/60 bg-background p-4 font-mono text-xs leading-relaxed">
              {quickstart}
            </pre>
          </CardContent>
        </Card>

        <Card className="mt-6 border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">recent runs</CardTitle>
            <Link
              to="/history"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              all history
              <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {entries === null ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">no runs yet.</p>
            ) : (
              entries.slice(0, 3).map((e) => (
                <div key={e.id} className="rounded-lg border border-border/60 px-3 py-2">
                  <p className="truncate text-sm">{e.text || "(empty)"}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {fmtDate(e.createdAt)} · {e.duration.toFixed(1)}s · {e.modelVer}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>mint api key</DialogTitle>
            <DialogDescription>name the project that will embed the dragon runtime.</DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && mint()}
            placeholder="jarvis voice loop"
          />
          <DialogFooter>
            <Button onClick={mint}>mint key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revealed !== null} onOpenChange={(open) => !open && setRevealed(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{revealed?.name}</DialogTitle>
            <DialogDescription>
              copy the secret now. it is shown once and lives only in this browser.
            </DialogDescription>
          </DialogHeader>
          <pre className="break-all rounded-lg border border-border/60 bg-background p-3 font-mono text-xs select-all">
            {revealed?.secret}
          </pre>
          <DialogFooter>
            <Button variant="secondary" onClick={() => revealed && copySecret(revealed.secret)}>
              copy
            </Button>
            <Button onClick={() => setRevealed(null)}>done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  )
}
