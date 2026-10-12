import type { Point } from '@/core/types/epicycle'

export interface Preset {
  id: string
  name: string
  build: () => Point[]
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
