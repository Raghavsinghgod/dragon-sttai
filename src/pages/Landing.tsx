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
  ["local only", "recording, features and inference all happen on this device"],
  ["own model", "dragon-stt int8 weights bundled at /models, never downloaded"],
  ["no accounts", "history lives in indexeddb, nothing syncs anywhere"],
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/60">
        <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <DragonGlyph className="w-5 h-5" />
            <span className="font-semibold tracking-wide">dragon stt</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/studio" className="hover:text-foreground transition-colors">
              studio
            </Link>
            <Link to="/history" className="hover:text-foreground transition-colors">
              history
            </Link>
            <Link to="/model" className="hover:text-foreground transition-colors">
              model
            </Link>
          </div>
        </nav>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-xl w-full py-20"
        >
          <DragonGlyph className="w-16 h-16 mx-auto mb-8 text-primary drop-shadow-[0_0_24px_rgba(232,147,58,0.35)]" />
          <h1 className="text-5xl font-bold tracking-tight">dragon stt</h1>
          <p className="mt-4 text-muted-foreground text-lg">
            voice in, text out, nothing leaves the device.
          </p>
          <Button asChild size="lg" className="mt-10 px-8 h-12 text-base">
            <Link to="/studio">open studio</Link>
          </Button>
          <div className="mt-16 grid gap-3 text-left border-t border-border/60 pt-8">
            {features.map(([title, body]) => (
              <motion.div
                key={title}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="flex gap-3"
              >
                <span className="text-primary font-medium shrink-0 w-24">{title}</span>
                <span className="text-sm text-muted-foreground">{body}</span>
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
