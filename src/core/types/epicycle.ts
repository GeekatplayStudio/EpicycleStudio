/** Basic 2D point in world (normalized) or screen space. */
export interface Point {
  x: number
  y: number
}

/** A sampled closed contour, uniformly resampled by arc length. */
export interface Contour {
  /** Number of samples. */
  n: number
  xs: Float64Array
  ys: Float64Array
}

/**
 * One term of the complex exponential series  c_k · e^{ikt}.
 * `k` may be negative. `radius` = |c_k|, `phase` = arg(c_k).
 */
export interface Harmonic {
  k: number
  re: number
  im: number
  radius: number
  phase: number
}

/**
 * Dual real-series coefficients.
 *   x(t) = a0/2 + Σ a_k cos(kt) + b_k sin(kt)
 *   y(t) = c0/2 + Σ c_k cos(kt) + d_k sin(kt)
 * Arrays are indexed by k, index 0 holds a0 / c0 (b0 = d0 = 0).
 */
export interface RealSeries {
  kMax: number
  a: Float64Array
  b: Float64Array
  c: Float64Array
  d: Float64Array
}

/** Full transform result for a contour. */
export interface Spectrum {
  n: number
  /** Complex coefficients c_k for k ∈ [-N/2, N/2 - 1], in frequency order 0, 1, -1, 2, -2 … */
  complex: Harmonic[]
  real: RealSeries
}

export type RenderMode = 'split' | 'complex'
export type SortMode = 'frequency' | 'amplitude'

export interface LayerToggles {
  circles: boolean
  arms: boolean
  projections: boolean
  ghost: boolean
  trail: boolean
}

/** Tip positions of a rotating chain at time t, tip-to-tail. */
export interface ChainState {
  /** Centers of each circle (length = terms). */
  centers: Point[]
  /** Tip of each arm (length = terms). The last tip is the pen. */
  tips: Point[]
  radii: number[]
  pen: Point
}
