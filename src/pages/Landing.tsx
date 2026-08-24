import { motion } from "framer-motion"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"

export function DragonGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path
        d="M6 44 L18 24 L14 10 L30 20 L46 14 L40 26 L58 30 L42 38 L50 54 L32 46 L20 58 Z"
        fill="currentColor"
      />
      <circle cx="34" cy="27" r="2.5" fill="#14110d" />
    </svg>
  )
}

const features = [
  ["local runtime", "decoding, log-mel features and ctc inference all run inside this tab"],
  ["own weights", "dragon-stt int8 ships bundled at /models and is never fetched again"],
  ["console + keys", "mint api keys per project and track usage from your dashboard"],
]

const codeLines = [
  "const { pcm } = await blobToPcm(recorded)",
  "const { text } = await transcribe(pcm)",
]

const navLinks = [
  ["/studio", "studio"],
  ["/dashboard", "console"],
  ["/history", "history"],
  ["/model", "model"],
]

export default function Landing() {
  return (
    <div className="relative min-h-screen flex flex-col bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
        style={{
          background:
            "radial-gradient(640px circle at 50% 12%, oklch(0.72 0.21 46 / 0.14), transparent 65%)",
        }}
      />
      <header className="relative border-b border-border/60">
        <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-primary">
            <DragonGlyph className="w-5 h-5" />
            <span className="font-semibold tracking-wide">dragon stt</span>
          </Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {navLinks.map(([to, label]) => (
              <Link key={to} to={to} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="relative flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-xl w-full py-20"
        >
          <DragonGlyph className="w-16 h-16 mx-auto mb-8 text-primary drop-shadow-[0_0_28px_rgba(239,106,53,0.4)]" />
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
            offline speech-to-text engine
          </p>
          <h1 className="mt-3 text-6xl font-bold tracking-tighter">dragon stt</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            voice in, text out, nothing leaves the device.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground/80">
            a private speech engine for assistants, kiosks and field tools. bundle the weights once,
            call the runtime forever — no cloud, no calls home.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="px-8 h-12 text-base">
              <Link to="/studio">open studio</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-8 h-12 text-base">
              <Link to="/dashboard">open console</Link>
            </Button>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="mx-auto mt-10 max-w-sm rounded-lg border border-border/60 bg-card p-4 text-left font-mono text-xs leading-relaxed"
          >
            {codeLines.map((line) => (
              <p key={line}>
                <span className="text-primary">›</span> {line}
              </p>
            ))}
          </motion.div>
          <div className="mt-16 grid gap-px overflow-hidden rounded-lg border border-border/60 bg-border/60 text-left sm:grid-cols-3">
            {features.map(([title, body], i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 + i * 0.1, duration: 0.5 }}
                className="bg-card p-5"
              >
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
      <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        offline after first load. no network calls. no telemetry.
      </footer>
    </div>
  )
}
