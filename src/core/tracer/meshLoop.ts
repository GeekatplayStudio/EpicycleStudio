import type { Point3 } from '@/core/types/epicycle'

/**
 * Closed-loop extraction from triangle meshes.
 *
 * - boundaryLoops: edges used by exactly one triangle form the open borders of
 *   a mesh (a cut-out, a trimmed surface, a flat shape with thickness zero).
 * - sectionLoops: intersection of the mesh with an axis-aligned plane, joined
 *   into polylines (a watertight model has no boundary, so it is sliced).
 */

export interface MeshData {
  /** xyz triplets, world convention (y down). */
  positions: Float32Array
  /** Triangle indices. */
  index: Uint32Array
}

export type Axis3 = 'x' | 'y' | 'z'

const AXIS_INDEX: Record<Axis3, number> = { x: 0, y: 1, z: 2 }

function loopLength(pts: Point3[], closed = true): number {
  let L = 0
  for (let i = 0; i < pts.length - 1; i++) L += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y, pts[i + 1].z - pts[i].z)
  if (closed && pts.length > 1) {
    const a = pts[pts.length - 1]
    const b = pts[0]
    L += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
  }
  return L
}

export function longestLoop(loops: Point3[][]): Point3[] | null {
  let best: Point3[] | null = null
  let bestLen = 0
  for (const l of loops) {
    if (l.length < 3) continue
    const len = loopLength(l)
    if (len > bestLen) {
      bestLen = len
      best = l
    }
  }
  return best
}

/** Centre the mesh and scale the largest half-extent to 1. Returns a copy. */
export function normalizeMesh(mesh: MeshData): MeshData {
  const p = mesh.positions
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < p.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      if (p[i + a] < min[a]) min[a] = p[i + a]
      if (p[i + a] > max[a]) max[a] = p[i + a]
    }
  }
  const c = [0, 1, 2].map((a) => (min[a] + max[a]) / 2)
  const half = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2 || 1
  const out = new Float32Array(p.length)
  for (let i = 0; i < p.length; i += 3) for (let a = 0; a < 3; a++) out[i + a] = (p[i + a] - c[a]) / half
  return { positions: out, index: mesh.index }
}

/** Loops of boundary edges (edges with exactly one adjacent triangle). */
export function boundaryLoops(mesh: MeshData): Point3[][] {
  const { positions, index } = mesh
  const edgeCount = new Map<string, number>()
  const key = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`)
  for (let i = 0; i < index.length; i += 3) {
    const tri = [index[i], index[i + 1], index[i + 2]]
    for (let e = 0; e < 3; e++) {
      const k = key(tri[e], tri[(e + 1) % 3])
      edgeCount.set(k, (edgeCount.get(k) ?? 0) + 1)
    }
  }
  const adj = new Map<number, number[]>()
  for (const [k, c] of edgeCount) {
    if (c !== 1) continue
    const [a, b] = k.split('_').map(Number)
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.has(b)) adj.set(b, [])
    adj.get(a)!.push(b)
    adj.get(b)!.push(a)
  }
  const visited = new Set<number>()
  const loops: Point3[][] = []
  const pt = (i: number): Point3 => ({ x: positions[i * 3], y: positions[i * 3 + 1], z: positions[i * 3 + 2] })
  for (const start of adj.keys()) {
    if (visited.has(start)) continue
    const loop: number[] = []
    let cur = start
    let prev = -1
    while (cur !== -1 && !visited.has(cur)) {
      visited.add(cur)
      loop.push(cur)
      const nb = adj.get(cur) ?? []
      const next = nb.find((n) => n !== prev && !visited.has(n))
      prev = cur
      cur = next ?? -1
    }
    if (loop.length >= 3) loops.push(loop.map(pt))
  }
  return loops
}

/** Intersection of the mesh with the plane  coordinate[axis] = offset. */
export function sectionLoops(mesh: MeshData, axis: Axis3, offset: number): Point3[][] {
  const { positions, index } = mesh
  const ai = AXIS_INDEX[axis]
  const segs: [Point3, Point3][] = []
  const v = (i: number): Point3 => ({ x: positions[i * 3], y: positions[i * 3 + 1], z: positions[i * 3 + 2] })
  const comp = (p: Point3) => (ai === 0 ? p.x : ai === 1 ? p.y : p.z)
  const lerp = (a: Point3, b: Point3): Point3 => {
    const da = comp(a) - offset
    const db = comp(b) - offset
    const u = da / (da - db)
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u }
  }
  for (let i = 0; i < index.length; i += 3) {
    const tri = [v(index[i]), v(index[i + 1]), v(index[i + 2])]
    const s = tri.map((p) => comp(p) - offset)
    const pts: Point3[] = []
    for (let e = 0; e < 3; e++) {
      const a = tri[e]
      const b = tri[(e + 1) % 3]
      const sa = s[e]
      const sb = s[(e + 1) % 3]
      if ((sa < 0 && sb >= 0) || (sa >= 0 && sb < 0)) pts.push(lerp(a, b))
    }
    if (pts.length === 2) segs.push([pts[0], pts[1]])
  }
  return joinSegments(segs)
}

/** Chain segments into polylines by matching endpoints (quantised). */
function joinSegments(segs: [Point3, Point3][]): Point3[][] {
  const q = 1e-4
  const keyOf = (p: Point3) => `${Math.round(p.x / q)}_${Math.round(p.y / q)}_${Math.round(p.z / q)}`
  const buckets = new Map<string, number[]>()
  segs.forEach((s, i) => {
    for (const p of s) {
      const k = keyOf(p)
      if (!buckets.has(k)) buckets.set(k, [])
      buckets.get(k)!.push(i)
    }
  })
  const used = new Uint8Array(segs.length)
  const loops: Point3[][] = []
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue
    used[i] = 1
    const line: Point3[] = [segs[i][0], segs[i][1]]
    // extend forward then backward
    for (const dir of [1, -1] as const) {
      for (;;) {
        const end = dir === 1 ? line[line.length - 1] : line[0]
        const cands = buckets.get(keyOf(end)) ?? []
        const j = cands.find((c) => !used[c])
        if (j === undefined) break
        used[j] = 1
        const [a, b] = segs[j]
        const next = keyOf(a) === keyOf(end) ? b : a
        if (dir === 1) line.push(next)
        else line.unshift(next)
      }
    }
    if (line.length >= 3) loops.push(line)
  }
  return loops
}

/** Extract the best closed loop according to the chosen strategy. */
export function extractLoop(mesh: MeshData, mode: 'boundary' | 'section', axis: Axis3, offset: number): { loop: Point3[] | null; usedSection: boolean } {
  if (mode === 'boundary') {
    const loop = longestLoop(boundaryLoops(mesh))
    if (loop) return { loop, usedSection: false }
  }
  return { loop: longestLoop(sectionLoops(mesh, axis, offset)), usedSection: true }
}
