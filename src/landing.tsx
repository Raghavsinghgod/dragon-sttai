import { Link, NavLink } from "react-router"
import { Button } from "@/ui"

export function DragonGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path
        d="M6 44 L18 24 L14 10 L30 20 L46 14 L40 26 L58 30 L42 38 L50 54 L32 46 L20 58 Z"
        fill="currentColor"
      />
      <circle cx="34" cy="27" r="2.5" fill="#000000" />
    </svg>
  )
}

const features = [
  "decoding, features and ctc inference all run inside this tab",
  "weights ship bundled at /models and are never fetched again",
  "mint api keys per project and track usage from the console",
]

const codeLines = [
  "const { pcm } = await blobToPcm(recorded)",
  "const { text } = await transcribe(pcm)",
]

const navLinks = [
  ["/studio", "studio"],
  ["/dashboard", "console"],
  ["/docs", "docs"],
  ["/history", "history"],
  ["/model", "model"],
]

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border/60">
        <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-primary">
            <DragonGlyph className="w-5 h-5" />
            <span className="font-semibold">dragon stt</span>
          </Link>
          <div className="flex items-center gap-3 text-xs text-muted-foreground sm:gap-4 sm:text-sm">
            {navLinks.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `transition-colors ${isActive ? "text-primary" : "hover:text-foreground"}`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-xl w-full py-20">
          <div className="animate-glyph-float">
            <DragonGlyph className="w-16 h-16 mx-auto mb-8 text-primary" />
          </div>
          <p className="font-mono text-xs text-primary">offline speech-to-text engine</p>
          <h1 className="mt-3 text-6xl font-bold">dragon stt</h1>
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
          <div className="mx-auto mt-10 max-w-sm rounded-lg border border-border/60 bg-card p-4 text-left font-mono text-xs leading-relaxed">
            {codeLines.map((line) => (
              <p key={line}>
                <span className="text-primary">&gt;</span> {line}
              </p>
            ))}
            <p>
              <span className="text-primary">&gt;</span>{" "}
              <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-primary" />
            </p>
          </div>
          <ul className="mx-auto mt-10 max-w-sm space-y-2 text-left text-sm text-muted-foreground">
            {features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-primary">-</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </main>
      <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        offline after first load. no network calls. no telemetry.
      </footer>
    </div>
  )
}
