import { useEffect, useRef } from "react"

type waveformProps = {
  analyser: AnalyserNode | null
  pcm: Float32Array | null
  active: boolean
}

export function Waveform({ analyser, pcm, active }: waveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    let raf = 0
    const buf = new Uint8Array(1024)

    const drawLive = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.fillStyle = "#14110d"
      ctx.fillRect(0, 0, w, h)
      if (analyser) {
        analyser.getByteTimeDomainData(buf)
        ctx.strokeStyle = "#e8933a"
        ctx.lineWidth = 2
        ctx.beginPath()
        for (let i = 0; i < buf.length; i++) {
          const x = (i / buf.length) * w
          const y = h / 2 + ((buf[i] - 128) / 128) * (h / 2 - 4)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      raf = requestAnimationFrame(drawLive)
    }

    const drawStatic = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.fillStyle = "#14110d"
      ctx.fillRect(0, 0, w, h)
      if (pcm && pcm.length) {
        const bars = Math.min(160, Math.floor(w / 4))
        const per = Math.floor(pcm.length / bars)
        ctx.fillStyle = active ? "#e8933a" : "#7a6a52"
        for (let b = 0; b < bars; b++) {
          let peak = 0
          for (let i = 0; i < per; i += 8) {
            const v = Math.abs(pcm[b * per + i] ?? 0)
            if (v > peak) peak = v
          }
          const bh = Math.max(2, peak * (h - 8))
          ctx.fillRect(b * 4, (h - bh) / 2, 2.5, bh)
        }
      }
    }

    if (active) {
      raf = requestAnimationFrame(drawLive)
    } else {
      drawStatic()
    }
    return () => cancelAnimationFrame(raf)
  }, [analyser, pcm, active])

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={120}
      className="w-full h-[120px] rounded-lg border border-border/60"
    />
  )
}
