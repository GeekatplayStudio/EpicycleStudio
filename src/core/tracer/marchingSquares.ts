import type { Point } from '@/core/types/epicycle'

/**
 * Bitmap → closed contour.
 *
 * Pipeline: downscale → luminance+alpha → Otsu threshold → polarity detection
 * (border majority = background) → largest 4-connected component → Moore
 * neighbourhood boundary following (radial boundary following, with Jacob's
 * stopping criterion). Produces an ordered loop of pixel-centre coordinates.
 */

export interface TraceOptions {
  /** Longest side after downscaling. */
  maxSize?: number
  /** Manual threshold 0..255; `undefined` → Otsu. */
  threshold?: number
  /** Force foreground polarity; `undefined` → auto. */
  invert?: boolean
}

export interface TraceResult {
  points: Point[]
  width: number
  height: number
  threshold: number
  inverted: boolean
  /** Pixel coverage of the traced component (0..1). */
  coverage: number
}

export function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not decode image'))
    }
    img.src = url
  })
}

export function imageToImageData(img: HTMLImageElement | HTMLCanvasElement, maxSize = 480): ImageData {
  const w0 = img instanceof HTMLImageElement ? img.naturalWidth : img.width
  const h0 = img instanceof HTMLImageElement ? img.naturalHeight : img.height
  const s = Math.min(1, maxSize / Math.max(w0, h0))
  const w = Math.max(2, Math.round(w0 * s))
  const h = Math.max(2, Math.round(h0 * s))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

/** Luminance composited over white for transparent pixels, plus 3×3 box blur. */
function toGray(data: ImageData): Float32Array {
  const { width: w, height: h, data: px } = data
  const g = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const a = px[i * 4 + 3] / 255
    const r = px[i * 4] * a + 255 * (1 - a)
    const gg = px[i * 4 + 1] * a + 255 * (1 - a)
    const b = px[i * 4 + 2] * a + 255 * (1 - a)
    g[i] = 0.2126 * r + 0.7152 * gg + 0.0722 * b
  }
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0
      let c = 0
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= w) continue
          s += g[yy * w + xx]
          c++
        }
      }
      out[y * w + x] = s / c
    }
  }
  return out
}

export function otsuThreshold(gray: Float32Array): number {
  const hist = new Float64Array(256)
  for (let i = 0; i < gray.length; i++) hist[Math.min(255, Math.max(0, Math.round(gray[i])))]++
  const total = gray.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0
  let wB = 0
  let best = 0
  let thr = 127
  for (let i = 0; i < 256; i++) {
    wB += hist[i]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += i * hist[i]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > best) {
      best = between
      thr = i
    }
  }
  return thr
}

/** Largest 4-connected foreground component as a mask. */
function largestComponent(mask: Uint8Array, w: number, h: number): { mask: Uint8Array; size: number } {
  const label = new Int32Array(w * h).fill(-1)
  const stack: number[] = []
  let bestId = -1
  let bestSize = 0
  let id = 0
  const sizes: number[] = []
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || label[start] !== -1) continue
    let size = 0
    stack.push(start)
    label[start] = id
    while (stack.length) {
      const p = stack.pop()!
      size++
      const x = p % w
      const y = (p - x) / w
      const nb = [p - 1, p + 1, p - w, p + w]
      const ok = [x > 0, x < w - 1, y > 0, y < h - 1]
      for (let i = 0; i < 4; i++) {
        const q = nb[i]
        if (ok[i] && mask[q] && label[q] === -1) {
          label[q] = id
          stack.push(q)
        }
      }
    }
    sizes.push(size)
    if (size > bestSize) {
      bestSize = size
      bestId = id
    }
    id++
  }
  const out = new Uint8Array(w * h)
  if (bestId >= 0) for (let i = 0; i < w * h; i++) out[i] = label[i] === bestId ? 1 : 0
  return { mask: out, size: bestSize }
}

// Moore neighbourhood, clockwise starting from west.
const DX = [-1, -1, 0, 1, 1, 1, 0, -1]
const DY = [0, -1, -1, -1, 0, 1, 1, 1]
/**
 * When we step from c to neighbour p = c + D[d], the previously examined
 * neighbour b = c + D[d−1] is background. The next search must start from
 * b as seen from p, i.e. direction of (D[d−1] − D[d]).
 */
const BACKTRACK = DX.map((_, d) => {
  const pd = (d + 7) % 8
  const vx = DX[pd] - DX[d]
  const vy = DY[pd] - DY[d]
  return DX.findIndex((x, i) => x === vx && DY[i] === vy)
})

/** Boundary following around the outer contour of a single component. */
function mooreTrace(mask: Uint8Array, w: number, h: number): Point[] {
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1
  // Start: first foreground pixel in raster order (its west neighbour is background).
  let sx = -1
  let sy = -1
  outer: for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) {
        sx = x
        sy = y
        break outer
      }
    }
  }
  if (sx < 0) return []

  const nextDir = (cx: number, cy: number, backtrack: number): number => {
    for (let i = 0; i < 8; i++) {
      const d = (backtrack + i) % 8
      if (at(cx + DX[d], cy + DY[d])) return d
    }
    return -1
  }

  const pts: Point[] = []
  let cx = sx
  let cy = sy
  let backtrack = 0
  const firstDir = nextDir(cx, cy, backtrack)
  if (firstDir < 0) return [{ x: sx + 0.5, y: sy + 0.5 }]
  const maxSteps = w * h * 4
  let steps = 0
  while (steps < maxSteps) {
    pts.push({ x: cx + 0.5, y: cy + 0.5 })
    const d = nextDir(cx, cy, backtrack)
    if (d < 0) break
    // Jacob's stopping criterion: at the start pixel and about to leave the same way.
    if (steps > 0 && cx === sx && cy === sy && d === firstDir) break
    backtrack = BACKTRACK[d]
    cx += DX[d]
    cy += DY[d]
    steps++
  }
  // The loop above pushes the start pixel twice when it terminates at the start.
  if (pts.length > 1) {
    const last = pts[pts.length - 1]
    if (last.x === sx + 0.5 && last.y === sy + 0.5) pts.pop()
  }
  return pts
}

export function traceImageData(data: ImageData, opts: TraceOptions = {}): TraceResult {
  const { width: w, height: h } = data
  const gray = toGray(data)
  const threshold = opts.threshold ?? otsuThreshold(gray)

  // Polarity: the border is assumed to be background.
  let darkBorder = 0
  let borderCount = 0
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      if (gray[y * w + x] <= threshold) darkBorder++
      borderCount++
    }
  }
  for (let y = 1; y < h - 1; y++) {
    for (const x of [0, w - 1]) {
      if (gray[y * w + x] <= threshold) darkBorder++
      borderCount++
    }
  }
  const borderIsDark = darkBorder / borderCount > 0.5
  const inverted = opts.invert ?? borderIsDark // foreground = light when border is dark

  const mask = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const dark = gray[i] <= threshold
    mask[i] = (inverted ? !dark : dark) ? 1 : 0
  }
  // Clear a 1px frame so the component never touches the edge.
  for (let x = 0; x < w; x++) {
    mask[x] = 0
    mask[(h - 1) * w + x] = 0
  }
  for (let y = 0; y < h; y++) {
    mask[y * w] = 0
    mask[y * w + w - 1] = 0
  }

  const comp = largestComponent(mask, w, h)
  if (comp.size < 16) throw new Error('No shape found. Try a higher-contrast silhouette.')
  const points = mooreTrace(comp.mask, w, h)
  if (points.length < 8) throw new Error('Traced contour is too short.')
  return { points, width: w, height: h, threshold, inverted, coverage: comp.size / (w * h) }
}

/** Reduce boundary points with a tolerance (Ramer–Douglas–Peucker, closed). */
export function simplify(points: Point[], tolerance = 0.75): Point[] {
  if (points.length < 4) return points
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length) {
    const [s, e] = stack.pop()!
    const a = points[s]
    const b = points[e]
    let maxD = 0
    let idx = -1
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    for (let i = s + 1; i < e; i++) {
      const p = points[i]
      const d = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len
      if (d > maxD) {
        maxD = d
        idx = i
      }
    }
    if (maxD > tolerance && idx > 0) {
      keep[idx] = 1
      stack.push([s, idx], [idx, e])
    }
  }
  return points.filter((_, i) => keep[i] === 1)
}
