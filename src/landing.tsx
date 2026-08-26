import { Link } from "react-router"
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

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4">
      <h1 className="text-6xl font-bold">dragon stt</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        voice in, text out, nothing leaves the device.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild size="lg" className="px-8 h-12 text-base">
          <Link to="/studio">open studio</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="px-8 h-12 text-base">
          <Link to="/dashboard">open console</Link>
        </Button>
      </div>
    </div>
  )
}
