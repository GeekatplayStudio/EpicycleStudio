import { create } from 'zustand'
import type { LayerToggles, Point, Point3, RenderMode, SortMode } from '@/core/types/epicycle'
import { normalize, resampleUniform, smoothClosed, type DepthMode } from '@/core/math/arcLength'
import { ALL_PRESETS, PRESETS } from '@/presets/shapes'
import { extractLoop, type Axis3, type MeshData } from '@/core/tracer/meshLoop'

export type Tool = 'draw' | 'view'
export type DrawPlane = 'screen' | 'xy' | 'xz' | 'yz'
export type ModelMode = 'boundary' | 'section'
export type Theme = 'dark' | 'light'
export type Viewport = '2d' | '3d'

export interface Palette {
  circles: string
  arms: string
  projections: string
  ghost: string
  trail: string
  pen: string
}

export const DARK_PALETTE: Palette = {
  circles: '#8b93a7',
  arms: '#e7e9ee',
  projections: '#5b6478',
  ghost: '#3a4150',
  trail: '#f5b942',
  pen: '#ffffff',
}

export const LIGHT_PALETTE: Palette = {
  circles: '#8e95a5',
  arms: '#1f2430',
  projections: '#a8aebb',
  ghost: '#c9cdd6',
  trail: '#d98f0b',
  pen: '#0b0d12',
}

export interface StudioState {
  /** Raw, normalized input points (centered, half-extent 1, y down, z = depth). */
  rawPoints: Point3[]
  sourceName: string
  /** Depth sculpting for flat inputs; 'source' keeps imported depth. */
  depthMode: DepthMode
  depthAmplitude: number
  depthHarmonic: number
  /** Imported 3D model (normalised to the unit box) used for loop extraction. */
  model: MeshData | null
  modelName: string
  modelMode: ModelMode
  sectionAxis: Axis3
  sectionOffset: number
  showModel: boolean
  /** 3D sketching: drawing plane orientation and offset along its normal. */
  drawPlane: DrawPlane
  drawOffset: number
  drawAppend: boolean
  n: number
  k: number
  mode: RenderMode
  sort: SortMode
  playing: boolean
  t: number
  speed: number
  layers: LayerToggles
  theme: Theme
  palette: Palette
  tool: Tool
  viewport: Viewport
  /** Extrude the trace along the time axis in the 3D view. */
  extrudeTime: boolean
  exportOpen: boolean
  toast: string | null

  setPoints: (pts: (Point | Point3)[], sourceName: string, opts?: { smooth?: boolean; is3D?: boolean; keepScale?: boolean }) => void
  appendPoints: (pts: Point3[]) => void
  setModel: (mesh: MeshData | null, name?: string) => void
  setModelOptions: (patch: Partial<{ modelMode: ModelMode; sectionAxis: Axis3; sectionOffset: number; showModel: boolean }>) => void
  setDrawPlane: (patch: Partial<{ drawPlane: DrawPlane; drawOffset: number; drawAppend: boolean }>) => void
  setDepth: (patch: Partial<{ depthMode: DepthMode; depthAmplitude: number; depthHarmonic: number }>) => void
  loadPreset: (id: string) => void
  clear: () => void
  setN: (n: number) => void
  setK: (k: number) => void
  setMode: (m: RenderMode) => void
  setSort: (s: SortMode) => void
  setPlaying: (p: boolean) => void
  togglePlaying: () => void
  setT: (t: number) => void
  setSpeed: (s: number) => void
  toggleLayer: (l: keyof LayerToggles) => void
  setTheme: (t: Theme) => void
  setPaletteColor: (key: keyof Palette, color: string) => void
  setTool: (t: Tool) => void
  setViewport: (v: Viewport) => void
  setExtrudeTime: (v: boolean) => void
  setExportOpen: (v: boolean) => void
  notify: (msg: string | null) => void
}

export const N_OPTIONS = [128, 256, 512, 1024, 2048] as const

/** Optional initial state from the URL, e.g. ?preset=star&k=12&mode=complex&view=3d&theme=light */
function fromUrl() {
  const q = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const preset = ALL_PRESETS.find((p) => p.id === q.get('preset')) ?? PRESETS[0]
  const n = Number(q.get('n'))
  const k = Number(q.get('k'))
  const theme: Theme = q.get('theme') === 'light' ? 'light' : 'dark'
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', theme === 'dark')
  return {
    preset,
    n: (N_OPTIONS as readonly number[]).includes(n) ? n : 512,
    k: k >= 1 ? Math.floor(k) : 24,
    mode: (q.get('mode') === 'complex' ? 'complex' : 'split') as RenderMode,
    viewport: (q.get('view') === '3d' || preset.is3D || q.get('depth') ? '3d' : '2d') as Viewport,
    theme,
    t: Number(q.get('t')) || 0,
    playing: q.get('paused') === null,
    tool: (q.get('tool') === 'draw' ? 'draw' : 'view') as Tool,
    depthMode: (['flat', 'wave', 'bowl', 'saddle', 'ramp'].includes(q.get('depth') ?? '') ? q.get('depth') : null) as DepthMode | null,
  }
}

const init = fromUrl()

export const useStudio = create<StudioState>((set, get) => ({
  rawPoints: normalize(init.preset.build()),
  sourceName: init.preset.name,
  depthMode: init.preset.is3D ? 'source' : (init.depthMode ?? 'flat'),
  depthAmplitude: 0.5,
  depthHarmonic: 2,
  model: null,
  modelName: '',
  modelMode: 'boundary',
  sectionAxis: 'y',
  sectionOffset: 0,
  showModel: true,
  drawPlane: 'screen',
  drawOffset: 0,
  drawAppend: false,
  n: init.n,
  k: Math.min(init.k, Math.floor(init.n / 2) - 1),
  mode: init.mode,
  sort: 'frequency',
  playing: init.playing,
  t: init.t,
  speed: 1,
  layers: { circles: true, arms: true, projections: true, ghost: true, trail: true },
  theme: init.theme,
  palette: init.theme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE,
  tool: init.tool,
  viewport: init.viewport,
  extrudeTime: false,
  exportOpen: false,
  toast: null,

  setPoints: (pts, sourceName, opts) => {
    let p = pts
    if (opts?.smooth) p = smoothClosed(p as Point[], 2, 2)
    const is3D = opts?.is3D ?? pts.some((q) => 'z' in q && q.z !== 0)
    const depthMode: DepthMode = is3D ? 'source' : get().depthMode === 'source' ? 'flat' : get().depthMode
    set({
      rawPoints: opts?.keepScale ? p.map((q) => ({ x: q.x, y: q.y, z: 'z' in q ? q.z : 0 })) : normalize(p),
      sourceName,
      depthMode,
      t: 0,
      tool: 'view',
      playing: true,
      viewport: is3D ? '3d' : get().viewport,
    })
  },
  appendPoints: (pts) => {
    const cur = get().rawPoints
    if (cur.length < 3) return get().setPoints(pts, '3D sketch', { is3D: true })
    set({ rawPoints: normalize([...cur, ...pts]), sourceName: '3D sketch', depthMode: 'source', t: 0, playing: true, viewport: '3d' })
  },
  setModel: (mesh, name = 'Model') => {
    set({ model: mesh, modelName: name })
    if (mesh) {
      set({ viewport: '3d', showModel: true })
      applyModel()
    }
  },
  setModelOptions: (patch) => {
    set(patch)
    if (patch.modelMode !== undefined || patch.sectionAxis !== undefined || patch.sectionOffset !== undefined) applyModel()
  },
  setDrawPlane: (patch) => set(patch),
  setDepth: (patch) => {
    const next = { ...patch }
    if (next.depthMode && next.depthMode !== 'flat' && next.depthMode !== 'source' && get().viewport === '2d') set({ viewport: '3d' })
    set(next)
  },
  loadPreset: (id) => {
    const preset = ALL_PRESETS.find((p) => p.id === id)
    if (preset) get().setPoints(preset.build(), preset.name, { is3D: !!preset.is3D })
  },
  clear: () => set({ rawPoints: [], sourceName: 'Empty', t: 0, tool: 'draw', depthMode: 'flat' }),
  setN: (n) => set({ n, k: Math.min(get().k, Math.floor(n / 2) - 1) }),
  setK: (k) => set({ k: Math.max(1, Math.min(k, Math.floor(get().n / 2) - 1)) }),
  setMode: (mode) => set({ mode }),
  setSort: (sort) => set({ sort }),
  setPlaying: (playing) => set({ playing }),
  togglePlaying: () => set({ playing: !get().playing }),
  setT: (t) => set({ t: ((t % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) }),
  setSpeed: (speed) => set({ speed }),
  toggleLayer: (l) => set({ layers: { ...get().layers, [l]: !get().layers[l] } }),
  setTheme: (theme) => {
    const prev = get().theme
    const palette = get().palette
    const wasDefault = JSON.stringify(palette) === JSON.stringify(prev === 'dark' ? DARK_PALETTE : LIGHT_PALETTE)
    set({ theme, palette: wasDefault ? (theme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE) : palette })
    document.documentElement.classList.toggle('dark', theme === 'dark')
  },
  setPaletteColor: (key, color) => set({ palette: { ...get().palette, [key]: color } }),
  setTool: (tool) => set({ tool }),
  setViewport: (viewport) => set({ viewport }),
  setExtrudeTime: (extrudeTime) => set({ extrudeTime }),
  setExportOpen: (exportOpen) => set({ exportOpen }),
  notify: (toast) => set({ toast }),
}))

/** Re-extract the loop from the current model with the current options. */
function applyModel() {
  const s = useStudio.getState()
  if (!s.model) return
  const { loop, usedSection } = extractLoop(s.model, s.modelMode, s.sectionAxis, s.sectionOffset)
  if (!loop) {
    s.notify('No loop found at this section. Move the offset or change the axis.')
    return
  }
  const label = usedSection ? `${s.modelName} · section ${s.sectionAxis} = ${s.sectionOffset.toFixed(2)}` : `${s.modelName} · boundary`
  s.setPoints(loop, label, { is3D: true, keepScale: true })
  if (usedSection && s.modelMode === 'boundary') set3({ modelMode: 'section' })
}
const set3 = (p: Partial<StudioState>) => useStudio.setState(p)

/** Resampled contour for the current points and N. */
export function sampleContour(points: Point[], n: number) {
  return resampleUniform(points, n)
}
