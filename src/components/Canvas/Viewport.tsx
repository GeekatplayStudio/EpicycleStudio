import { lazy, Suspense, useState } from 'react'
import { useStudio } from '@/store/useStudio'
import type { SpectrumData } from '@/store/useSpectrum'
import { useImport } from '@/hooks/useImport'
import { EpicycleRenderer } from './EpicycleRenderer'
import { DrawingSurface } from './DrawingSurface'
import { OverlayControls } from './OverlayControls'
import { Draw3DControls } from './Draw3DControls'
import { Button, Kbd } from '@/components/ui/primitives'
import { Pen } from '@/components/ui/icons'

const Epicycle3D = lazy(() => import('@/components/Three/Epicycle3D').then((m) => ({ default: m.Epicycle3D })))

export function Viewport({ data }: { data: SpectrumData }) {
  const tool = useStudio((s) => s.tool)
  const setTool = useStudio((s) => s.setTool)
  const viewport = useStudio((s) => s.viewport)
  const { importFile } = useImport()
  const [dragging, setDragging] = useState(false)

  return (
    <div
      className="relative min-w-0 flex-1 bg-bg"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files?.[0]
        if (f) void importFile(f)
      }}
      onPaste={(e) => {
        const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))
        const f = item?.getAsFile()
        if (f) void importFile(f, 'Pasted image')
      }}
    >
      {viewport === '2d' ? (
        <EpicycleRenderer data={data} dimmed={tool === 'draw'} />
      ) : (
        <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-[12px] text-fg-3">Loading three.js…</div>}>
          <Epicycle3D data={data} />
        </Suspense>
      )}

      {tool === 'draw' && viewport === '2d' && <DrawingSurface />}
      {tool === 'draw' && viewport === '3d' && <Draw3DControls />}
      {tool !== 'draw' && <OverlayControls data={data} />}

      {!data.hasShape && tool !== 'draw' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="pointer-events-auto flex flex-col items-center gap-3 text-center">
            <div className="text-[15px] font-medium">Nothing to decompose yet</div>
            <p className="max-w-xs text-[12.5px] leading-relaxed text-fg-3">
              Draw a closed shape in 2D or 3D, pick a preset, or drop an SVG, image or 3D model onto the viewport.
            </p>
            <Button variant="accent" onClick={() => setTool('draw')}>
              <Pen /> Start drawing <Kbd>D</Kbd>
            </Button>
          </div>
        </div>
      )}

      {dragging && (
        <div className="pointer-events-none absolute inset-3 grid place-items-center rounded-2xl border-2 border-dashed border-accent bg-accent-soft text-[13px] font-medium text-fg">
          Drop SVG or image to trace
        </div>
      )}
    </div>
  )
}
