import { Link } from "react-router"
import { DragonGlyph } from "@/pages/Landing"

const links = [
  ["/studio", "studio"],
  ["/dashboard", "console"],
  ["/docs", "docs"],
  ["/history", "history"],
  ["/model", "model"],
]

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/60">
        <nav className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-primary">
            <DragonGlyph className="w-5 h-5" />
            <span className="font-semibold tracking-wide">dragon stt</span>
          </Link>
          <div className="flex items-center gap-3 text-xs text-muted-foreground sm:gap-4 sm:text-sm">
            {links.map(([to, label]) => (
              <Link key={to} to={to} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
