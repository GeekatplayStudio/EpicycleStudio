import type { ChainState, Contour, Harmonic, Point, RealSeries, SortMode, Spectrum } from '@/core/types/epicycle'

/** Select the active complex harmonics |k| ≤ K and order them for chaining. */
export function selectHarmonics(spectrum: Spectrum, K: number, sort: SortMode): Harmonic[] {
  const active = spectrum.complex.filter((h) => Math.abs(h.k) <= K)
  if (sort === 'amplitude') {
    return [...active].sort((p, q) => q.radius - p.radius)
  }
  return active
}

/** Evaluate the complex chain c_k e^{ikt} tip-to-tail. */
export function evalComplexChain(harmonics: Harmonic[], t: number): ChainState {
  const centers: Point[] = new Array(harmonics.length)
  const tips: Point[] = new Array(harmonics.length)
  const radii: number[] = new Array(harmonics.length)
  let x = 0
  let y = 0
  for (let i = 0; i < harmonics.length; i++) {
    const h = harmonics[i]
    centers[i] = { x, y }
    const ang = h.k * t + h.phase
    x += h.radius * Math.cos(ang)
    y += h.radius * Math.sin(ang)
    tips[i] = { x, y }
    radii[i] = h.radius
  }
  return { centers, tips, radii, pen: { x, y } }
}

/**
 * Terms of a real series as rotating arms:  a_k cos(kt) + b_k sin(kt) = R_k cos(kt − φ_k)
 * with R_k = √(a² + b²), φ_k = atan2(b, a).
 */
export interface RealTerm {
  k: number
  radius: number
  phase: number
}

export function realTerms(series: RealSeries, axis: 'x' | 'y', K: number, sort: SortMode): RealTerm[] {
  const A = axis === 'x' ? series.a : series.c
  const B = axis === 'x' ? series.b : series.d
  const terms: RealTerm[] = []
  const kMax = Math.min(K, series.kMax)
  for (let k = 1; k <= kMax; k++) {
    terms.push({ k, radius: Math.hypot(A[k], B[k]), phase: Math.atan2(B[k], A[k]) })
  }
  if (sort === 'amplitude') terms.sort((p, q) => q.radius - p.radius)
  return terms
}

/**
 * Evaluate a real-series chain. The chain is drawn in a plane; for the x axis
 * the horizontal component of the final tip equals Σ R_k cos(kt − φ_k),
 * for the y axis the vertical component does. `origin` is the chain anchor
 * (DC offset already applied by the caller).
 */
export function evalRealChain(terms: RealTerm[], t: number, origin: Point, axis: 'x' | 'y'): ChainState {
  const centers: Point[] = new Array(terms.length)
  const tips: Point[] = new Array(terms.length)
  const radii: number[] = new Array(terms.length)
  let x = origin.x
  let y = origin.y
  for (let i = 0; i < terms.length; i++) {
    const h = terms[i]
    centers[i] = { x, y }
    const ang = h.k * t - h.phase
    if (axis === 'x') {
      x += h.radius * Math.cos(ang)
      y += h.radius * Math.sin(ang)
    } else {
      // rotate by +90° so that the vertical component is R cos(kt − φ)
      x += -h.radius * Math.sin(ang)
      y += h.radius * Math.cos(ang)
    }
    tips[i] = { x, y }
    radii[i] = h.radius
  }
  return { centers, tips, radii, pen: { x, y } }
}

/** x(t), y(t) from the truncated real series. */
export function evalRealPoint(series: RealSeries, K: number, t: number): Point {
  const kMax = Math.min(K, series.kMax)
  let x = series.a[0] / 2
  let y = series.c[0] / 2
  for (let k = 1; k <= kMax; k++) {
    const c = Math.cos(k * t)
    const s = Math.sin(k * t)
    x += series.a[k] * c + series.b[k] * s
    y += series.c[k] * c + series.d[k] * s
  }
  return { x, y }
}

/** Reconstruct the truncated curve at the original N sample instants. */
export function reconstruct(spectrum: Spectrum, K: number): Contour {
  const n = spectrum.n
  const xs = new Float64Array(n)
  const ys = new Float64Array(n)
  const active = spectrum.complex.filter((h) => Math.abs(h.k) <= K)
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / n
    let x = 0
    let y = 0
    for (const h of active) {
      const ang = h.k * t + h.phase
      x += h.radius * Math.cos(ang)
      y += h.radius * Math.sin(ang)
    }
    xs[i] = x
    ys[i] = y
  }
  return { n, xs, ys }
}

/** Root-mean-square reconstruction error (Section 2.2). */
export function rmse(actual: Contour, approx: Contour): number {
  const n = actual.n
  let acc = 0
  for (let i = 0; i < n; i++) {
    const dx = actual.xs[i] - approx.xs[i]
    const dy = actual.ys[i] - approx.ys[i]
    acc += dx * dx + dy * dy
  }
  return Math.sqrt(acc / n)
}

/** Sum of radii of a term list (used to lay out the split view). */
export function sumRadii(terms: { radius: number }[]): number {
  let s = 0
  for (const t of terms) s += t.radius
  return s
}
