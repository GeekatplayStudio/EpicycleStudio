import type { Contour, Point, Point3 } from '@/core/types/epicycle'

/** Removes consecutive duplicates / sub-pixel jitter. */
export function dedupe(points: Point[], eps = 1e-6): Point[] {
  const out: Point[] = []
  for (const p of points) {
    const last = out[out.length - 1]
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > eps) out.push(p)
  }
  return out
}

/** Simple closed-loop moving-average smoothing. */
export function smoothClosed(points: Point[], passes = 1, window = 1): Point[] {
  if (points.length < 3 || passes <= 0) return points
  let pts = points
  for (let p = 0; p < passes; p++) {
    const m = pts.length
    const out: Point[] = new Array(m)
    for (let i = 0; i < m; i++) {
      let sx = 0
      let sy = 0
      let cnt = 0
      for (let w = -window; w <= window; w++) {
        const q = pts[(i + w + m) % m]
        sx += q.x
        sy += q.y
        cnt++
      }
      out[i] = { x: sx / cnt, y: sy / cnt }
    }
    pts = out
  }
  return pts
}

/** Perimeter of a polyline; closes the loop when `closed` is true. */
export function pathLength(points: Point[], closed = true): number {
  let L = 0
  for (let i = 0; i < points.length - 1; i++) {
    L += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y)
  }
  if (closed && points.length > 1) {
    const a = points[points.length - 1]
    const b = points[0]
    L += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return L
}

/**
 * Resample a closed polyline into `n` points at equidistant arc length
 * s_i = i · L / n.
 */
export function resampleUniform(points: (Point | Point3)[], n: number): Contour {
  const pts = dedupe(points as Point[]) as (Point | Point3)[]
  const xs = new Float64Array(n)
  const ys = new Float64Array(n)
  const zs = new Float64Array(n)
  const zOf = (p: Point | Point3) => ('z' in p && Number.isFinite(p.z) ? p.z : 0)
  let is3D = false
  for (const p of pts) if (zOf(p) !== 0) is3D = true
  if (pts.length === 0) return { n, xs, ys, zs, is3D: false }
  if (pts.length === 1) {
    xs.fill(pts[0].x)
    ys.fill(pts[0].y)
    zs.fill(zOf(pts[0]))
    return { n, xs, ys, zs, is3D }
  }

  const m = pts.length
  // Cumulative arc length (3D) including the closing segment.
  const cum = new Float64Array(m + 1)
  for (let i = 0; i < m; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % m]
    cum[i + 1] = cum[i] + Math.hypot(b.x - a.x, b.y - a.y, zOf(b) - zOf(a))
  }
  const L = cum[m]
  if (L === 0) {
    xs.fill(pts[0].x)
    ys.fill(pts[0].y)
    zs.fill(zOf(pts[0]))
    return { n, xs, ys, zs, is3D }
  }

  let seg = 0
  for (let i = 0; i < n; i++) {
    const s = (i * L) / n
    while (seg < m - 1 && cum[seg + 1] < s) seg++
    const a = pts[seg]
    const b = pts[(seg + 1) % m]
    const segLen = cum[seg + 1] - cum[seg]
    const u = segLen > 0 ? (s - cum[seg]) / segLen : 0
    xs[i] = a.x + (b.x - a.x) * u
    ys[i] = a.y + (b.y - a.y) * u
    zs[i] = zOf(a) + (zOf(b) - zOf(a)) * u
  }
  return { n, xs, ys, zs, is3D }
}

/** Axis-aligned bounds of a point list. */
export function bounds(points: Point[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

/**
 * Translate to the centre of the bounding box and scale so the largest
 * half-extent (over x, y and z) equals 1. Keeps y pointing down (screen
 * convention) so that drawings and traces match visually.
 */
export function normalize(points: (Point | Point3)[]): Point3[] {
  if (points.length === 0) return []
  const b = bounds(points)
  let minZ = Infinity
  let maxZ = -Infinity
  for (const p of points) {
    const z = 'z' in p ? p.z : 0
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
  }
  const cx = (b.minX + b.maxX) / 2
  const cy = (b.minY + b.maxY) / 2
  const cz = (minZ + maxZ) / 2
  const half = Math.max(b.width, b.height, maxZ - minZ) / 2 || 1
  return points.map((p) => ({ x: (p.x - cx) / half, y: (p.y - cy) / half, z: (('z' in p ? p.z : 0) - cz) / half }))
}

export type DepthMode = 'flat' | 'source' | 'wave' | 'bowl' | 'saddle' | 'ramp'

/**
 * Procedural depth for flat drawings. `u` is the normalised position along
 * the loop (0 … 2π). Source depth is kept when mode is 'source'.
 */
export function applyDepth(points: Point3[], mode: DepthMode, amplitude: number, harmonic: number): Point3[] {
  if (mode === 'source') return points
  if (mode === 'flat') return points.map((p) => ({ x: p.x, y: p.y, z: 0 }))
  const m = points.length
  return points.map((p, i) => {
    const u = (2 * Math.PI * i) / m
    let z = 0
    switch (mode) {
      case 'wave':
        z = Math.sin(harmonic * u)
        break
      case 'bowl':
        z = p.x * p.x + p.y * p.y - 0.5
        break
      case 'saddle':
        z = 2 * p.x * p.y
        break
      case 'ramp':
        z = p.y
        break
    }
    return { x: p.x, y: p.y, z: z * amplitude }
  })
}

/** Convert a contour back to a point list. */
export function contourToPoints(c: Contour): Point[] {
  const out: Point[] = new Array(c.n)
  for (let i = 0; i < c.n; i++) out[i] = { x: c.xs[i], y: c.ys[i] }
  return out
}
