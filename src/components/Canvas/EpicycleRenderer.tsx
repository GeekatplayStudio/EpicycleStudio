import { useEffect, useRef } from 'react'
import { useStudio } from '@/store/useStudio'
import type { SpectrumData } from '@/store/useSpectrum'
import { evalComplexChain, evalRealChain, sumRadii } from '@/core/math/evaluate'
import type { ChainState, Point } from '@/core/types/epicycle'
import { canvasRegistry } from './canvasRegistry'
import { fitBox, sceneBox, splitAnchors, type ViewTransform } from './sceneLayout'

interface Props {
  data: SpectrumData
  dimmed?: boolean
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(v, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

/**
 * High-DPI Canvas 2D renderer. Draws the ghost path, epicycle chains
 * (split or complex), projections, trace trail and the pen.
 */
export function EpicycleRenderer({ data, dimmed }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])
  const viewRef = useRef<ViewTransform | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    canvasRegistry.set(canvas)
    const ctx = canvas.getContext('2d', { alpha: true })!
    let raf = 0
    let w = 0
    let h = 0
    let dpr = 1

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = Math.max(1, Math.round(rect.width))
      h = Math.max(1, Math.round(rect.height))
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const draw = () => {
      raf = requestAnimationFrame(draw)
      const s = useStudio.getState()
      const d = dataRef.current
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      if (!d.hasShape) return

      const { palette, layers, mode, t } = s
      const dark = s.theme === 'dark'

      // --- layout -----------------------------------------------------------
      const sumRx = sumRadii(d.xTerms)
      const sumRy = sumRadii(d.yTerms)
      const sumRc = sumRadii(d.harmonics)
      const target = fitBox(sceneBox(mode, sumRx, sumRy, sumRc), w, h)
      const prev = viewRef.current
      const view: ViewTransform = prev
        ? {
            scale: prev.scale + (target.scale - prev.scale) * 0.18,
            ox: prev.ox + (target.ox - prev.ox) * 0.18,
            oy: prev.oy + (target.oy - prev.oy) * 0.18,
          }
        : target
      viewRef.current = view
      const S = view.scale
      const X = (x: number) => view.ox + x * S
      const Y = (y: number) => view.oy + y * S

      ctx.globalAlpha = dimmed ? 0.25 : 1
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'

      // --- ghost path -------------------------------------------------------
      if (layers.ghost) {
        ctx.beginPath()
        for (let i = 0; i < d.contour.n; i++) {
          const x = X(d.contour.xs[i])
          const y = Y(d.contour.ys[i])
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.strokeStyle = palette.ghost
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // --- chains -----------------------------------------------------------
      let pen: Point
      const drawChain = (chain: ChainState) => {
        if (layers.circles) {
          ctx.strokeStyle = hexToRgba(palette.circles, dark ? 0.42 : 0.5)
          ctx.lineWidth = 1
          ctx.beginPath()
          for (let i = 0; i < chain.centers.length; i++) {
            const r = chain.radii[i] * S
            if (r < 0.6) continue
            const c = chain.centers[i]
            ctx.moveTo(X(c.x) + r, Y(c.y))
            ctx.arc(X(c.x), Y(c.y), r, 0, Math.PI * 2)
          }
          ctx.stroke()
        }
        if (layers.arms) {
          ctx.strokeStyle = palette.arms
          ctx.lineWidth = 1.25
          ctx.beginPath()
          if (chain.centers.length) {
            ctx.moveTo(X(chain.centers[0].x), Y(chain.centers[0].y))
            for (const tip of chain.tips) ctx.lineTo(X(tip.x), Y(tip.y))
          }
          ctx.stroke()
          // joints
          ctx.fillStyle = hexToRgba(palette.arms, 0.55)
          for (let i = 1; i < chain.centers.length; i++) {
            const c = chain.centers[i]
            if (chain.radii[i] * S < 2) continue
            ctx.beginPath()
            ctx.arc(X(c.x), Y(c.y), 1.4, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      const label = (text: string, x: number, y: number) => {
        ctx.fillStyle = palette.projections
        ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, x, y)
      }

      if (mode === 'split') {
        const a0 = d.spectrum.real.a[0]
        const c0 = d.spectrum.real.c[0]
        const { xAnchor, yAnchor } = splitAnchors(a0, c0, sumRx, sumRy)
        const xChain = evalRealChain(d.xTerms, t, xAnchor, 'x')
        const yChain = evalRealChain(d.yTerms, t, yAnchor, 'y')
        pen = { x: xChain.pen.x, y: yChain.pen.y }

        drawChain(xChain)
        drawChain(yChain)

        if (layers.projections) {
          ctx.strokeStyle = palette.projections
          ctx.lineWidth = 1
          ctx.setLineDash([3, 5])
          ctx.beginPath()
          ctx.moveTo(X(xChain.pen.x), Y(xChain.pen.y))
          ctx.lineTo(X(pen.x), Y(pen.y))
          ctx.moveTo(X(yChain.pen.x), Y(yChain.pen.y))
          ctx.lineTo(X(pen.x), Y(pen.y))
          ctx.stroke()
          ctx.setLineDash([])
          // chain tips
          ctx.fillStyle = palette.projections
          ctx.beginPath()
          ctx.arc(X(xChain.pen.x), Y(xChain.pen.y), 2.5, 0, Math.PI * 2)
          ctx.arc(X(yChain.pen.x), Y(yChain.pen.y), 2.5, 0, Math.PI * 2)
          ctx.fill()
        }
        label('x(t)', X(xAnchor.x), Y(xAnchor.y - sumRx) - 14)
        label('y(t)', X(yAnchor.x - sumRy) - 22, Y(yAnchor.y))
      } else {
        const chain = evalComplexChain(d.harmonics, t)
        pen = chain.pen
        drawChain(chain)
      }

      // --- trail (deterministic: slice of reconstruction ending at t) -----------
      if (layers.trail) {
        const n = d.approx.n
        const endF = (t / (2 * Math.PI)) * n
        const endI = Math.floor(endF)
        const chunks = 28
        const perChunk = Math.ceil(n / chunks)
        ctx.lineWidth = 2
        for (let c = 0; c < chunks; c++) {
          const age = c / chunks // 0 = newest
          const alpha = Math.pow(1 - age, 1.6) * 0.95 + 0.03
          ctx.strokeStyle = hexToRgba(palette.trail, alpha)
          ctx.beginPath()
          const from = endI - c * perChunk
          const to = from - perChunk
          for (let i = from; i >= to; i--) {
            const idx = ((i % n) + n) % n
            const x = X(d.approx.xs[idx])
            const y = Y(d.approx.ys[idx])
            if (i === from) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }
        // connect newest sample to the exact pen
        ctx.strokeStyle = palette.trail
        ctx.beginPath()
        const li = ((endI % n) + n) % n
        ctx.moveTo(X(d.approx.xs[li]), Y(d.approx.ys[li]))
        ctx.lineTo(X(pen.x), Y(pen.y))
        ctx.stroke()
      }

      // --- pen --------------------------------------------------------------
      ctx.fillStyle = palette.pen
      ctx.beginPath()
      ctx.arc(X(pen.x), Y(pen.y), 3.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = hexToRgba(palette.trail, 0.5)
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(X(pen.x), Y(pen.y), 6.5, 0, Math.PI * 2)
      ctx.stroke()
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      if (canvasRegistry.get() === canvas) canvasRegistry.set(null)
    }
  }, [dimmed])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-label="Epicycle animation" />
}
