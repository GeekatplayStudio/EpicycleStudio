import type { Contour, Harmonic, Spectrum } from '@/core/types/epicycle'

/**
 * Forward DFT of a complex sequence:  Z_k = Σ_n z_n e^{-2πikn/N}.
 * Uses an iterative radix-2 FFT when N is a power of two, otherwise a
 * twiddle-table direct DFT (still < 16 ms for N = 1024 on a desktop).
 */
export function dft(re: Float64Array, im: Float64Array): { re: Float64Array; im: Float64Array } {
  const n = re.length
  if (n > 0 && (n & (n - 1)) === 0) return fft(re, im)
  return directDft(re, im)
}

function directDft(re: Float64Array, im: Float64Array) {
  const n = re.length
  const outRe = new Float64Array(n)
  const outIm = new Float64Array(n)
  const cosT = new Float64Array(n)
  const sinT = new Float64Array(n)
  for (let m = 0; m < n; m++) {
    const th = (2 * Math.PI * m) / n
    cosT[m] = Math.cos(th)
    sinT[m] = Math.sin(th)
  }
  for (let k = 0; k < n; k++) {
    let sr = 0
    let si = 0
    let idx = 0
    for (let j = 0; j < n; j++) {
      // e^{-iθ} = cos θ - i sin θ
      const c = cosT[idx]
      const s = sinT[idx]
      sr += re[j] * c + im[j] * s
      si += im[j] * c - re[j] * s
      idx += k
      if (idx >= n) idx -= n
    }
    outRe[k] = sr
    outIm[k] = si
  }
  return { re: outRe, im: outIm }
}

function fft(inRe: Float64Array, inIm: Float64Array) {
  const n = inRe.length
  const re = Float64Array.from(inRe)
  const im = Float64Array.from(inIm)
  // Bit reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      let t = re[i]
      re[i] = re[j]
      re[j] = t
      t = im[i]
      im[i] = im[j]
      im[j] = t
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wRe = Math.cos(ang)
    const wIm = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1
      let ci = 0
      const half = len >> 1
      for (let j = 0; j < half; j++) {
        const uRe = re[i + j]
        const uIm = im[i + j]
        const vRe = re[i + j + half] * cr - im[i + j + half] * ci
        const vIm = re[i + j + half] * ci + im[i + j + half] * cr
        re[i + j] = uRe + vRe
        im[i + j] = uIm + vIm
        re[i + j + half] = uRe - vRe
        im[i + j + half] = uIm - vIm
        const nr = cr * wRe - ci * wIm
        ci = cr * wIm + ci * wRe
        cr = nr
      }
    }
  }
  return { re, im }
}

/** Ordering 0, 1, -1, 2, -2, … up to ±N/2 (N/2 only for the positive side when N even). */
export function frequencyOrder(n: number): number[] {
  const half = Math.floor(n / 2)
  const kPosMax = n % 2 === 0 ? half - 1 : half
  const ks: number[] = [0]
  for (let k = 1; k <= half; k++) {
    if (k <= kPosMax) ks.push(k)
    ks.push(-k)
  }
  return ks
}

/**
 * Compute the full spectrum of a contour (Sections 1.2 & 1.3).
 * Real-series coefficients are derived from the complex spectrum using
 *   X_k = (Z_k + conj(Z_{-k})) / 2 ,  Y_k = (Z_k − conj(Z_{-k})) / (2i)
 * so only one transform is required.
 */
export function computeSpectrum(contour: Contour): Spectrum {
  const n = contour.n
  const { re: Zr, im: Zi } = dft(contour.xs, contour.ys)
  const half = Math.floor(n / 2)

  const complex: Harmonic[] = []
  for (const k of frequencyOrder(n)) {
    const idx = ((k % n) + n) % n
    const re = Zr[idx] / n
    const im = Zi[idx] / n
    complex.push({ k, re, im, radius: Math.hypot(re, im), phase: Math.atan2(im, re) })
  }

  const kMax = half
  const a = new Float64Array(kMax + 1)
  const b = new Float64Array(kMax + 1)
  const c = new Float64Array(kMax + 1)
  const d = new Float64Array(kMax + 1)
  for (let k = 0; k <= kMax; k++) {
    const ip = k % n
    const im_ = ((-k % n) + n) % n
    // X_k = (Z_k + conj(Z_-k)) / 2
    const Xr = (Zr[ip] + Zr[im_]) / 2
    const Xi = (Zi[ip] - Zi[im_]) / 2
    // Y_k = (Z_k - conj(Z_-k)) / (2i)  →  (Yr, Yi) = ((Zi[k] + Zi[-k]) / 2, -(Zr[k] - Zr[-k]) / 2)
    const Yr = (Zi[ip] + Zi[im_]) / 2
    const Yi = -(Zr[ip] - Zr[im_]) / 2
    // a_k = 2/N Re X_k ; b_k = -2/N Im X_k  (since Σ x cos = Re, Σ x sin = -Im)
    a[k] = (2 / n) * Xr
    b[k] = (-2 / n) * Xi
    c[k] = (2 / n) * Yr
    d[k] = (-2 / n) * Yi
  }
  // Nyquist term for even N appears only once; the real series uses it fully.
  return { n, complex, real: { kMax, a, b, c, d } }
}

/** Maximum harmonic degree K available for a given N. */
export function maxHarmonics(n: number): number {
  return Math.max(1, Math.floor(n / 2) - 1)
}
