import { useStudio, type DrawPlane } from '@/store/useStudio'
import { Segmented, Toggle } from '@/components/ui/primitives'

/** Floating controls for sketching in the 3D view. */
export function Draw3DControls() {
  const drawPlane = useStudio((s) => s.drawPlane)
  const drawOffset = useStudio((s) => s.drawOffset)
  const drawAppend = useStudio((s) => s.drawAppend)
  const setDrawPlane = useStudio((s) => s.setDrawPlane)
  const hasShape = useStudio((s) => s.rawPoints.length >= 3)
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
        <div className="fade-up rounded-full border border-line bg-bg-2/80 px-3 py-1.5 text-[12px] text-fg-2 backdrop-blur">
          Sketch on the plane · one stroke closes the loop · right-drag to orbit
        </div>
      </div>
      <div className="fade-up absolute bottom-4 right-4 flex w-64 flex-col gap-3 rounded-xl border border-line bg-bg-2/90 p-3 backdrop-blur">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-3">Drawing plane</div>
        <Segmented<DrawPlane>
          size="sm"
          value={drawPlane}
          onChange={(v) => setDrawPlane({ drawPlane: v })}
          options={[
            { value: 'screen', label: 'Screen', title: 'Faces the camera' },
            { value: 'xy', label: 'XY' },
            { value: 'xz', label: 'XZ' },
            { value: 'yz', label: 'YZ' },
          ]}
        />
        <label className="flex flex-col gap-1 text-[12px] text-fg-2">
          <span className="flex justify-between">
            Offset along normal <span className="font-mono tabular-nums">{drawOffset.toFixed(2)}</span>
          </span>
          <input type="range" min={-1.5} max={1.5} step={0.01} value={drawOffset} onChange={(e) => setDrawPlane({ drawOffset: Number(e.target.value) })} />
        </label>
        <Toggle checked={drawAppend && hasShape} onChange={(v) => setDrawPlane({ drawAppend: v })} label="Append to current curve" />
      </div>
    </>
  )
}
