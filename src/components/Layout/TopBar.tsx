import { useRef } from 'react'
import { useStudio } from '@/store/useStudio'
import { PRESETS } from '@/presets/shapes'
import { useImport } from '@/hooks/useImport'
import { Button, Segmented } from '@/components/ui/primitives'
import { Chevron, Cube, Cursor, Download, Logo, Moon, Panel, Pen, Square, Sun, Trash, Upload } from '@/components/ui/icons'
import { ModeSelector } from '@/components/Controls/ModeSelector'

export function TopBar({ dockOpen, onToggleDock }: { dockOpen: boolean; onToggleDock: () => void }) {
  const tool = useStudio((s) => s.tool)
  const setTool = useStudio((s) => s.setTool)
  const theme = useStudio((s) => s.theme)
  const setTheme = useStudio((s) => s.setTheme)
  const viewport = useStudio((s) => s.viewport)
  const setViewport = useStudio((s) => s.setViewport)
  const loadPreset = useStudio((s) => s.loadPreset)
  const clear = useStudio((s) => s.clear)
  const setExportOpen = useStudio((s) => s.setExportOpen)
  const sourceName = useStudio((s) => s.sourceName)
  const { importFile } = useImport()
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <header className="flex h-12 items-center gap-2 border-b border-line bg-bg-2 px-3">
      <Button size="icon" onClick={onToggleDock} title={dockOpen ? 'Hide dock' : 'Show dock'} active={dockOpen} aria-label="Toggle dock">
        <Panel />
      </Button>
      <div className="flex items-center gap-2 pr-2">
        <Logo className="text-fg" />
        <div className="leading-none">
          <div className="text-[13.5px] font-semibold tracking-tight">EpicycleStudio</div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-fg-3">Geekatplay Studio</div>
        </div>
      </div>

      <div className="mx-1 h-5 w-px bg-line" />

      <div className="relative">
        <select
          value={PRESETS.find((p) => p.name === sourceName)?.id ?? ''}
          onChange={(e) => e.target.value && loadPreset(e.target.value)}
          className="h-8 appearance-none rounded-lg border border-line bg-bg-3 pl-3 pr-8 text-[12.5px] text-fg outline-none hover:border-line-2"
          aria-label="Presets"
        >
          <option value="" disabled>
            Presets
          </option>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Chevron className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-fg-3" />
      </div>

      <Segmented
        value={tool}
        onChange={setTool}
        options={[
          { value: 'view', label: (<><Cursor /> View</>), title: 'Pan/inspect (Esc)' },
          { value: 'draw', label: (<><Pen /> Draw</>), title: 'Freehand contour (D)' },
        ]}
      />
      <Button size="icon" title="Clear drawing" onClick={clear} aria-label="Clear">
        <Trash />
      </Button>

      <input
        ref={fileRef}
        type="file"
        accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp,image/gif,image/bmp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void importFile(f)
          e.target.value = ''
        }}
      />
      <Button variant="outline" onClick={() => fileRef.current?.click()} title="Import SVG or bitmap silhouette">
        <Upload /> Import
      </Button>

      <div className="flex-1" />

      <div className="hidden md:block">
        <ModeSelector />
      </div>

      <div className="mx-1 h-5 w-px bg-line" />

      <Segmented
        value={viewport}
        onChange={setViewport}
        options={[
          { value: '2d', label: (<><Square /> 2D</>), title: 'Canvas renderer' },
          { value: '3d', label: (<><Cube /> 3D</>), title: '3D view (three.js)' },
        ]}
      />
      <Button size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme" aria-label="Toggle theme">
        {theme === 'dark' ? <Sun /> : <Moon />}
      </Button>
      <Button variant="accent" onClick={() => setExportOpen(true)} title="Export (E)">
        <Download /> Export
      </Button>
    </header>
  )
}
