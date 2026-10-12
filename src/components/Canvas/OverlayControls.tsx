import { useStudio } from '@/store/useStudio'
import type { LayerToggles } from '@/core/types/epicycle'
import type { SpectrumData } from '@/store/useSpectrum'
import { cx } from '@/components/ui/cx'

const LAYERS: { key: keyof LayerToggles; label: string }[] = [
  { key: 'circles', label: 'Circles' },
  { key: 'arms', label: 'Arms' },
  { key: 'projections', label: 'Projections' },
  { key: 'ghost', label: 'Ghost' },
  { key: 'trail', label: 'Trail' },
]

/** Floating layer chips + live readout on the viewport. */
export function OverlayControls({ data }: { data: SpectrumData }) {
  const layers = useStudio((s) => s.layers)
  const toggleLayer = useStudio((s) => s.toggleLayer)
  const mode = useStudio((s) => s.mode)
  const sourceName = useStudio((s) => s.sourceName)
  const viewport = useStudio((s) => s.viewport)
  const setViewport = useStudio((s) => s.setViewport)

  return (
    <>
      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-[12.5px] font-medium text-fg">
          {sourceName}
          {data.is3D && viewport === '2d' && (
            <button type="button" onClick={() => setViewport('3d')} className="pointer-events-auto rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-medium text-accent hover:brightness-110">
              3D curve · open 3D view
            </button>
          )}
        </div>
        <div className="font-mono text-[11px] text-fg-3 tabular-nums">
          {mode === 'split' ? 'dual series' : 'complex chain'}
          {data.is3D ? ' + z(t)' : ''} · N {data.contour.n} · K {data.K} · rmse {data.error.toExponential(2)}
        </div>
      </div>
      <div className="absolute right-4 top-4 flex flex-wrap justify-end gap-1">
        {LAYERS.filter((l) => !(l.key === 'projections' && mode !== 'split')).map((l) => (
          <button
            key={l.key}
            type="button"
            onClick={() => toggleLayer(l.key)}
            className={cx(
              'h-6 rounded-full border px-2.5 text-[11px] transition-colors',
              layers[l.key]
                ? 'border-line-2 bg-bg-2/80 text-fg backdrop-blur'
                : 'border-transparent bg-transparent text-fg-3 line-through decoration-fg-3/60 hover:text-fg-2',
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
    </>
  )
}
