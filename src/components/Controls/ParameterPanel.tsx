import { N_OPTIONS, useStudio, type Palette } from '@/store/useStudio'
import { Divider, Label, Segmented, Toggle } from '@/components/ui/primitives'
import type { LayerToggles, SortMode } from '@/core/types/epicycle'
import { ModeSelector } from './ModeSelector'

const LAYERS: { key: keyof LayerToggles; label: string }[] = [
  { key: 'circles', label: 'Guide circles' },
  { key: 'arms', label: 'Phasor arms' },
  { key: 'projections', label: 'Projection lines' },
  { key: 'ghost', label: 'Reference ghost path' },
  { key: 'trail', label: 'Trace trail' },
]

const COLORS: { key: keyof Palette; label: string }[] = [
  { key: 'circles', label: 'Circles' },
  { key: 'arms', label: 'Arms' },
  { key: 'projections', label: 'Projections' },
  { key: 'ghost', label: 'Ghost' },
  { key: 'trail', label: 'Trail' },
  { key: 'pen', label: 'Pen' },
]

/** Sampling density, chaining order, layers and colors. */
export function ParameterPanel() {
  const n = useStudio((s) => s.n)
  const setN = useStudio((s) => s.setN)
  const sort = useStudio((s) => s.sort)
  const setSort = useStudio((s) => s.setSort)
  const layers = useStudio((s) => s.layers)
  const toggleLayer = useStudio((s) => s.toggleLayer)
  const palette = useStudio((s) => s.palette)
  const setPaletteColor = useStudio((s) => s.setPaletteColor)
  const extrudeTime = useStudio((s) => s.extrudeTime)
  const setExtrudeTime = useStudio((s) => s.setExtrudeTime)
  const viewport = useStudio((s) => s.viewport)

  return (
    <div className="flex flex-col gap-5 p-4">
      <section className="flex flex-col gap-2">
        <Label>Mode</Label>
        <ModeSelector size="sm" />
      </section>

      <section className="flex flex-col gap-2">
        <Label hint={`N = ${n}`}>Sampling density</Label>
        <Segmented<string>
          size="sm"
          value={String(n)}
          onChange={(v) => setN(Number(v))}
          options={N_OPTIONS.map((v) => ({ value: String(v), label: v }))}
        />
        <p className="text-[11.5px] leading-relaxed text-fg-3">Uniform arc-length samples. Power-of-two sizes use the FFT path.</p>
      </section>

      <section className="flex flex-col gap-2">
        <Label>Chain order</Label>
        <Segmented<SortMode>
          size="sm"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'frequency', label: 'Frequency', title: '0, 1, −1, 2, −2 …' },
            { value: 'amplitude', label: 'Amplitude', title: 'Largest radius first (stable base circles)' },
          ]}
        />
      </section>

      <Divider />

      <section className="flex flex-col gap-0.5">
        <Label>Layers</Label>
        {LAYERS.map((l) => (
          <Toggle key={l.key} checked={layers[l.key]} onChange={() => toggleLayer(l.key)} label={l.label} />
        ))}
        {viewport === '3d' && <Toggle checked={extrudeTime} onChange={setExtrudeTime} label="3D · extrude trace along time" />}
      </section>

      <Divider />

      <section className="flex flex-col gap-2">
        <Label>Colors</Label>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {COLORS.map((c) => (
            <label key={c.key} className="flex items-center justify-between gap-2 text-[12px] text-fg-2">
              {c.label}
              <input type="color" value={palette[c.key]} onChange={(e) => setPaletteColor(c.key, e.target.value)} aria-label={`${c.label} color`} />
            </label>
          ))}
        </div>
      </section>
    </div>
  )
}
