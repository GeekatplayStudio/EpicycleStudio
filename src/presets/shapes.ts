import type { Point, Point3 } from '@/core/types/epicycle'

export interface Preset {
  id: string
  name: string
  /** True for closed space curves (non-zero depth). */
  is3D?: boolean
  build: () => (Point | Point3)[]
}

const sample = (f: (u: number) => Point, m = 720): Point[] => Array.from({ length: m }, (_, i) => f((2 * Math.PI * i) / m))

export const PRESETS: Preset[] = [
  {
    id: 'heart',
    name: 'Heart',
    build: () =>
      sample((u) => ({
        x: 16 * Math.sin(u) ** 3,
        y: -(13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u)),
      })),
  },
  {
    id: 'star',
    name: 'Star',
    build: () => {
      const pts: Point[] = []
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 1 : 0.45
        const a = (Math.PI * i) / 5 - Math.PI / 2
        pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) })
      }
      return pts
    },
  },
  {
    id: 'square',
    name: 'Square',
    build: () => [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
    ],
  },
  {
    id: 'triangle',
    name: 'Triangle',
    build: () => [
      { x: 0, y: -1 },
      { x: 0.95, y: 0.65 },
      { x: -0.95, y: 0.65 },
    ],
  },
  {
    id: 'infinity',
    name: 'Infinity',
    build: () => sample((u) => ({ x: Math.cos(u) / (1 + Math.sin(u) ** 2), y: (Math.sin(u) * Math.cos(u)) / (1 + Math.sin(u) ** 2) })),
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    build: () =>
      sample((u) => {
        const r = Math.exp(Math.sin(u)) - 2 * Math.cos(4 * u) + Math.sin((2 * u - Math.PI) / 24) ** 5
        return { x: r * Math.sin(u), y: -r * Math.cos(u) }
      }),
  },
  {
    id: 'gear',
    name: 'Gear',
    build: () =>
      sample((u) => {
        const r = 1 + 0.18 * Math.tanh(6 * Math.sin(12 * u))
        return { x: r * Math.cos(u), y: r * Math.sin(u) }
      }, 1440),
  },
  {
    id: 'pi',
    name: 'π',
    build: () => [
      { x: -1.0, y: -0.75 }, { x: 1.0, y: -0.75 }, { x: 1.0, y: -0.45 }, { x: 0.65, y: -0.45 },
      { x: 0.65, y: 0.55 }, { x: 0.85, y: 0.75 }, { x: 0.55, y: 0.85 }, { x: 0.35, y: 0.55 },
      { x: 0.35, y: -0.45 }, { x: -0.3, y: -0.45 }, { x: -0.3, y: 0.2 }, { x: -0.6, y: 0.85 },
      { x: -0.85, y: 0.75 }, { x: -0.6, y: 0.1 }, { x: -0.6, y: -0.45 }, { x: -1.0, y: -0.45 },
    ],
  },
]

const sample3 = (f: (u: number) => Point3, m = 900): Point3[] => Array.from({ length: m }, (_, i) => f((2 * Math.PI * i) / m))

/** Closed space curves. y is negated so "up" in the formula points up on screen. */
export const PRESETS_3D: Preset[] = [
  {
    id: 'trefoil',
    name: 'Trefoil knot',
    is3D: true,
    build: () =>
      sample3((u) => ({
        x: Math.sin(u) + 2 * Math.sin(2 * u),
        y: -(Math.cos(u) - 2 * Math.cos(2 * u)),
        z: -Math.sin(3 * u),
      })),
  },
  {
    id: 'torus-knot',
    name: 'Torus knot (3,5)',
    is3D: true,
    build: () =>
      sample3((u) => {
        const p = 3
        const q = 5
        const r = 2 + Math.cos(q * u)
        return { x: r * Math.cos(p * u), y: -r * Math.sin(p * u), z: Math.sin(q * u) }
      }, 1400),
  },
  {
    id: 'viviani',
    name: 'Viviani curve',
    is3D: true,
    build: () => sample3((u) => ({ x: 1 + Math.cos(u), y: -Math.sin(u), z: 2 * Math.sin(u / 2) })),
  },
  {
    id: 'seam',
    name: 'Baseball seam',
    is3D: true,
    build: () =>
      sample3((u) => {
        const a = 0.4
        return {
          x: Math.cos(u) * Math.cos(a * Math.sin(2 * u)),
          y: -Math.sin(u) * Math.cos(a * Math.sin(2 * u)),
          z: Math.sin(a * Math.sin(2 * u)) * 2.2,
        }
      }),
  },
  {
    id: 'lissajous3',
    name: 'Lissajous 3·4·5',
    is3D: true,
    build: () => sample3((u) => ({ x: Math.sin(3 * u), y: -Math.sin(4 * u + Math.PI / 2), z: Math.sin(5 * u) }), 1400),
  },
  {
    id: 'spring',
    name: 'Closed spring',
    is3D: true,
    build: () =>
      sample3((u) => {
        const r = 1 + 0.35 * Math.cos(8 * u)
        return { x: r * Math.cos(u), y: -r * Math.sin(u), z: 0.35 * Math.sin(8 * u) }
      }, 1600),
  },
]

export const ALL_PRESETS: Preset[] = [...PRESETS, ...PRESETS_3D]
