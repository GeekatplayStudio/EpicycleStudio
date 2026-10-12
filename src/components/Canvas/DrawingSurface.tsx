import { useEffect, useRef, useState } from 'react'
import { useStudio } from '@/store/useStudio'
import type { Point } from '@/core/types/epicycle'
import { dedupe } from '@/core/math/arcLength'

/**
 * Freehand input. Captures pointer events, shows the live stroke and the
 * closing segment, and commits a closed contour on release.
 */
export function DrawingSurface() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pts = useRef<Point[]>([])
  const drawing = useRef(false)
  const [count, setCount] = useState(0)
  const setPoints = useStudio((s) => s.setPoints)
  const setTool = useStudio((s) => s.setTool)
  const palette = useStudio((s) => s.palette)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let dpr = 1
    let w = 0
    let h = 0
    const resize = () => {
      const r = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = Math.round(r.width)
      h = Math.round(r.height)
      canvas.width = w * dpr
      canvas.height = h * dpr
      render()
    }
    const render = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const p = pts.current
      if (p.length < 1) return
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.lineWidth = 2
      ctx.strokeStyle = palette.trail
      ctx.beginPath()
      ctx.moveTo(p[0].x, p[0].y)
      for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y)
      ctx.stroke()
      if (p.length > 2) {
        const a = p[p.length - 1]
        const b = p[0]
        ctx.setLineDash([4, 6])
        ctx.strokeStyle = palette.projections
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
        ctx.setLineDash([])
      }
      ctx.fillStyle = palette.pen
      ctx.beginPath()
      ctx.arc(p[0].x, p[0].y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const pos = (e: PointerEvent): Point => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      canvas.setPointerCapture(e.pointerId)
      drawing.current = true
      pts.current = [pos(e)]
      setCount(1)
      render()
    }
    const move = (e: PointerEvent) => {
      if (!drawing.current) return
      const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e]
      for (const ev of events) {
        const p = pos(ev)
        const last = pts.current[pts.current.length - 1]
        if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= 1.5) pts.current.push(p)
      }
      setCount(pts.current.length)
      render()
    }
    const up = (e: PointerEvent) => {
      if (!drawing.current) return
      drawing.current = false
      canvas.releasePointerCapture(e.pointerId)
      const p = dedupe(pts.current, 0.5)
      if (p.length >= 8) {
        // Closing threshold: snap when the stroke ends near where it began.
        const a = p[0]
        const b = p[p.length - 1]
        const size = Math.max(w, h)
        if (Math.hypot(a.x - b.x, a.y - b.y) < size * 0.035) p.pop()
        setPoints(p, 'Freehand', { smooth: true })
        setTool('view')
      }
      pts.current = []
      setCount(0)
      render()
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    return () => {
      ro.disconnect()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
    }
  }, [palette, setPoints, setTool])

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full cursor-crosshair touch-none" aria-label="Drawing surface" />
      <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
        <div className="fade-up rounded-full border border-line bg-bg-2/80 px-3 py-1.5 text-[12px] text-fg-2 backdrop-blur">
          {count > 0 ? `Drawing · ${count} points · release to close the loop` : 'Draw one closed shape in a single stroke'}
        </div>
      </div>
    </>
  )
}
