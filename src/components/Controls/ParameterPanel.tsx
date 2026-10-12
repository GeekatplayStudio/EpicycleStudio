import { N_OPTIONS, useStudio, type ModelMode, type Palette } from '@/store/useStudio'
import type { Axis3 } from '@/core/tracer/meshLoop'
import { Divider, Label, Segmented, Toggle } from '@/components/ui/primitives'
import type { LayerToggles, SortMode } from '@/core/types/epicycle'
import type { DepthMode } from '@/core/math/arcLength'
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
  const depthMode = useStudio((s) => s.depthMode)
  const depthAmplitude = useStudio((s) => s.depthAmplitude)
  const depthHarmonic = useStudio((s) => s.depthHarmonic)
  const setDepth = useStudio((s) => s.setDepth)
  const hasSourceDepth = useStudio((s) => s.rawPoints.some((p) => p.z !== 0))
  const model = useStudio((s) => s.model)
  const modelName = useStudio((s) => s.modelName)
  const modelMode = useStudio((s) => s.modelMode)
  const sectionAxis = useStudio((s) => s.sectionAxis)
  const sectionOffset = useStudio((s) => s.sectionOffset)
  const showModel = useStudio((s) => s.showModel)
  const setModelOptions = useStudio((s) => s.setModelOptions)
  const setModel = useStudio((s) => s.setModel)

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

      {model && (
        <>
          <Divider />
          <section className="flex flex-col gap-2">
            <Label hint={`${model.index.length / 3} tris`}>Model · {modelName}</Label>
            <Segmented<ModelMode>
              size="sm"
              value={modelMode}
              onChange={(m) => setModelOptions({ modelMode: m })}
              options={[
                { value: 'boundary', label: 'Boundary loop', title: 'Longest open edge of the mesh' },
                { value: 'section', label: 'Cross-section', title: 'Slice with an axis-aligned plane' },
              ]}
            />
            {modelMode === 'section' && (
              <>
                <Segmented<Axis3>
                  size="sm"
                  value={sectionAxis}
                  onChange={(a) => setModelOptions({ sectionAxis: a })}
                  options={[
                    { value: 'x', label: 'X plane' },
                    { value: 'y', label: 'Y plane' },
                    { value: 'z', label: 'Z plane' },
                  ]}
                />
                <label className="flex flex-col gap-1 text-[12px] text-fg-2">
                  <span className="flex justify-between">
                    Section offset <span className="font-mono tabular-nums">{sectionOffset.toFixed(2)}</span>
                  </span>
                  <input type="range" min={-0.98} max={0.98} step={0.01} value={sectionOffset} onChange={(e) => setModelOptions({ sectionOffset: Number(e.target.value) })} aria-label="Section offset" />
                </label>
              </>
            )}
            <Toggle checked={showModel} onChange={(v) => setModelOptions({ showModel: v })} label="Show model wireframe" />
            <button type="button" onClick={() => setModel(null)} className="self-start text-[12px] text-fg-3 hover:text-fg">
              Remove model
            </button>
          </section>
        </>
      )}

      <Divider />

      <section className="flex flex-col gap-2">
        <Label hint={depthMode === 'flat' ? 'z = 0' : depthMode === 'source' ? 'from input' : `A = ${depthAmplitude.toFixed(2)}`}>Depth · z(t)</Label>
        <Segmented<DepthMode>
          size="sm"
          className="flex-wrap"
          value={depthMode}
          onChange={(m) => setDepth({ depthMode: m })}
          options={[
            { value: 'flat', label: 'Flat' },
            ...(hasSourceDepth ? [{ value: 'source' as DepthMode, label: 'Source' }] : []),
            { value: 'wave', label: 'Wave', title: 'z = A·sin(m·t)' },
            { value: 'bowl', label: 'Bowl', title: 'z = A·(x² + y² − ½)' },
            { value: 'saddle', label: 'Saddle', title: 'z = 2A·x·y' },
            { value: 'ramp', label: 'Ramp', title: 'z = A·y' },
          ]}
        />
        {depthMode !== 'flat' && depthMode !== 'source' && (
          <>
            <input type="range" min={0.05} max={1.5} step={0.01} value={depthAmplitude} onChange={(e) => setDepth({ depthAmplitude: Number(e.target.value) })} aria-label="Depth amplitude" />
            {depthMode === 'wave' && (
              <label className="flex items-center justify-between text-[12px] text-fg-2">
                Wave harmonic m
                <input type="number" min={1} max={32} value={depthHarmonic} onChange={(e) => setDepth({ depthHarmonic: Math.max(1, Math.min(32, Number(e.target.value) || 1)) })} className="h-7 w-16 rounded-md border border-line bg-bg-3 px-2 font-mono text-[12px] text-fg tabular-nums outline-none" />
              </label>
            )}
          </>
        )}
        <p className="text-[11.5px] leading-relaxed text-fg-3">A third Fourier series z(t) is fitted to the depth and drawn as its own chain in the 3D view.</p>
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
