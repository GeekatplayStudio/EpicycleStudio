import { useMemo } from 'react'
import type { SpectrumData } from '@/store/useSpectrum'
import { useStudio } from '@/store/useStudio'

/**
 * Live amplitude spectrum: one bar per |k| showing |c_k| (positive) stacked on
 * |c_{-k}| (negative). Active harmonics (≤ K) are highlighted; click to set K.
 */
export function SpectrumChart({ data }: { data: SpectrumData }) {
  const setK = useStudio((s) => s.setK)
  const t = useStudio((s) => s.t)
  const shown = Math.min(data.kMax, Math.max(48, Math.min(96, data.K + 16)))

  const bars = useMemo(() => {
    const byK = new Map<number, number>()
    for (const h of data.spectrum.complex) byK.set(h.k, h.radius)
    let max = 0
    const out: { k: number; pos: number; neg: number }[] = []
    for (let k = 1; k <= shown; k++) {
      const pos = byK.get(k) ?? 0
      const neg = byK.get(-k) ?? 0
      out.push({ k, pos, neg })
      max = Math.max(max, pos + neg)
    }
    return { out, max: max || 1 }
  }, [data.spectrum, shown])

  const W = 320
  const H = 96
  const gap = 1
  const bw = (W - gap * (shown - 1)) / shown
  // Sqrt scale keeps high harmonics visible.
  const scale = (v: number) => Math.sqrt(v / bars.max) * (H - 4)

  return (
    <div className="flex flex-col gap-1.5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-24 w-full cursor-ew-resize select-none"
        role="img"
        aria-label="Amplitude spectrum"
        onPointerDown={(e) => {
          const el = e.currentTarget
          el.setPointerCapture(e.pointerId)
          const pick = (clientX: number) => {
            const r = el.getBoundingClientRect()
            const k = Math.round(((clientX - r.left) / r.width) * shown)
            setK(Math.max(1, Math.min(shown, k)))
          }
          pick(e.clientX)
          const move = (ev: PointerEvent) => pick(ev.clientX)
          const up = () => {
            el.removeEventListener('pointermove', move)
            el.removeEventListener('pointerup', up)
          }
          el.addEventListener('pointermove', move)
          el.addEventListener('pointerup', up)
        }}
      >
        {bars.out.map((b, i) => {
          const x = i * (bw + gap)
          const hp = scale(b.pos)
          const hn = scale(b.neg)
          const active = b.k <= data.K
          const phase = (b.k * t) % (2 * Math.PI)
          const pulse = active ? 0.75 + 0.25 * Math.cos(phase) : 1
          return (
            <g key={b.k} opacity={active ? pulse : 0.28}>
              <rect x={x} y={H - hp - hn} width={bw} height={hn} fill={active ? 'var(--fg-3)' : 'var(--line-2)'} />
              <rect x={x} y={H - hp} width={bw} height={hp} fill={active ? 'var(--accent)' : 'var(--line-2)'} />
            </g>
          )
        })}
        <line x1={(data.K / shown) * W} x2={(data.K / shown) * W} y1={0} y2={H} stroke="var(--fg)" strokeWidth={1} strokeDasharray="2 3" />
      </svg>
      <div className="flex justify-between font-mono text-[10px] text-fg-3 tabular-nums">
        <span>k = 1</span>
        <span className="text-fg-2">
          <span className="inline-block h-2 w-2 rounded-sm bg-accent align-middle" /> +k &nbsp;
          <span className="inline-block h-2 w-2 rounded-sm bg-fg-3 align-middle" /> −k
        </span>
        <span>{shown}</span>
      </div>
    </div>
  )
}
