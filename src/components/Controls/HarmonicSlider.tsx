import { useStudio } from '@/store/useStudio'
import { Label } from '@/components/ui/primitives'

/** Truncation degree K ∈ [1, N/2 − 1]. */
export function HarmonicSlider({ kMax, error }: { kMax: number; error: number }) {
  const k = useStudio((s) => s.k)
  const setK = useStudio((s) => s.setK)
  const K = Math.min(k, kMax)
  return (
    <div className="flex min-w-[220px] flex-1 flex-col gap-1">
      <Label hint={<span>K = {K} · rmse {error.toExponential(2)}</span>}>Harmonics</Label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          className="accent"
          min={1}
          max={kMax}
          step={1}
          value={K}
          onChange={(e) => setK(Number(e.target.value))}
          aria-label="Active harmonics K"
        />
        <input
          type="number"
          min={1}
          max={kMax}
          value={K}
          onChange={(e) => setK(Number(e.target.value))}
          className="h-7 w-16 rounded-md border border-line bg-bg-3 px-2 font-mono text-[12px] text-fg tabular-nums outline-none focus:border-line-2"
          aria-label="Active harmonics K (number)"
        />
      </div>
    </div>
  )
}
