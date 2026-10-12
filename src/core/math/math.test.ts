import { describe, expect, it } from 'vitest'
import { resampleUniform, normalize, pathLength } from './arcLength'
import { computeSpectrum, dft, maxHarmonics } from './dft'
import { evalComplexChain, evalRealPoint, reconstruct, rmse, selectHarmonics } from './evaluate'

function circle(n: number, r = 1) {
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n
    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) })
  }
  return pts
}

function square(side = 2) {
  const h = side / 2
  return [
    { x: -h, y: -h },
    { x: h, y: -h },
    { x: h, y: h },
    { x: -h, y: h },
  ]
}

describe('arc length resampling', () => {
  it('computes the closed perimeter', () => {
    expect(pathLength(square(2))).toBeCloseTo(8)
  })
  it('resamples a square into equidistant points', () => {
    const c = resampleUniform(square(2), 8)
    expect(c.n).toBe(8)
    // every other sample lands on a corner / edge midpoint
    expect(c.xs[0]).toBeCloseTo(-1)
    expect(c.ys[0]).toBeCloseTo(-1)
    expect(c.xs[1]).toBeCloseTo(0)
    expect(c.ys[1]).toBeCloseTo(-1)
    expect(c.xs[2]).toBeCloseTo(1)
  })
  it('normalizes to unit half-extent', () => {
    const pts = normalize([
      { x: 10, y: 10 },
      { x: 30, y: 10 },
      { x: 30, y: 20 },
    ])
    expect(Math.max(...pts.map((p) => Math.abs(p.x)))).toBeCloseTo(1)
  })
})

describe('dft', () => {
  it('matches a direct DFT for power-of-two and odd lengths', () => {
    for (const n of [8, 7]) {
      const re = Float64Array.from({ length: n }, (_, i) => Math.sin(i) + i * 0.1)
      const im = Float64Array.from({ length: n }, (_, i) => Math.cos(2 * i))
      const out = dft(re, im)
      for (let k = 0; k < n; k++) {
        let sr = 0
        let si = 0
        for (let j = 0; j < n; j++) {
          const th = (-2 * Math.PI * k * j) / n
          sr += re[j] * Math.cos(th) - im[j] * Math.sin(th)
          si += re[j] * Math.sin(th) + im[j] * Math.cos(th)
        }
        expect(out.re[k]).toBeCloseTo(sr, 8)
        expect(out.im[k]).toBeCloseTo(si, 8)
      }
    }
  })

  it('a circle is a single harmonic k = 1', () => {
    const contour = resampleUniform(circle(64), 64)
    const spec = computeSpectrum(contour)
    const h1 = spec.complex.find((h) => h.k === 1)!
    expect(h1.radius).toBeCloseTo(1, 6)
    const others = spec.complex.filter((h) => h.k !== 1)
    for (const h of others) expect(h.radius).toBeLessThan(1e-9)
    // real form: x = cos t, y = sin t  →  a1 = 1, d1 = 1
    expect(spec.real.a[1]).toBeCloseTo(1, 6)
    expect(spec.real.d[1]).toBeCloseTo(1, 6)
    expect(spec.real.b[1]).toBeCloseTo(0, 6)
    expect(spec.real.c[1]).toBeCloseTo(0, 6)
  })

  it('a square has odd harmonics decaying like 1/k²', () => {
    const contour = resampleUniform(square(2), 256)
    const spec = computeSpectrum(contour)
    const r = (k: number) => spec.complex.find((h) => h.k === k)!.radius
    expect(r(2)).toBeLessThan(1e-9)
    expect(r(4)).toBeLessThan(1e-9)
    // |c_{-3}| / |c_1| ≈ 1/9 for an arc-length parameterized square
    expect(r(-3) / r(1)).toBeCloseTo(1 / 9, 2)
    expect(r(5) / r(1)).toBeCloseTo(1 / 25, 2)
  })

  it('real and complex evaluations agree and the error shrinks with K', () => {
    const contour = resampleUniform(square(2), 128)
    const spec = computeSpectrum(contour)
    const K = maxHarmonics(128)
    const t = 1.234
    const chain = evalComplexChain(selectHarmonics(spec, K, 'frequency'), t)
    const p = evalRealPoint(spec.real, K, t)
    expect(chain.pen.x).toBeCloseTo(p.x, 8)
    expect(chain.pen.y).toBeCloseTo(p.y, 8)

    const e3 = rmse(contour, reconstruct(spec, 3))
    const e15 = rmse(contour, reconstruct(spec, 15))
    const eFull = rmse(contour, reconstruct(spec, K))
    expect(e15).toBeLessThan(e3)
    expect(eFull).toBeLessThan(1e-6)
  })

  it('runs N = 1024 under 16 ms', () => {
    const contour = resampleUniform(circle(2000), 1024)
    const t0 = performance.now()
    computeSpectrum(contour)
    expect(performance.now() - t0).toBeLessThan(16)
  })
})

describe('space curves', () => {
  it('fits a third real series to depth and reconstructs it', () => {
    const pts = Array.from({ length: 200 }, (_, i) => {
      const u = (2 * Math.PI * i) / 200
      return { x: Math.cos(u), y: Math.sin(u), z: 0.5 * Math.sin(3 * u) }
    })
    const contour = resampleUniform(pts, 256)
    expect(contour.is3D).toBe(true)
    const spec = computeSpectrum(contour)
    expect(spec.is3D).toBe(true)
    // z = 0.5 sin(3t) → f_3 ≈ 0.5 (arc-length reparameterisation perturbs it slightly)
    expect(spec.real.f[3]).toBeCloseTo(0.5, 1)
    expect(Math.abs(spec.real.e[3])).toBeLessThan(0.05)
    const K = maxHarmonics(256)
    const err = rmse(contour, reconstruct(spec, K))
    expect(err).toBeLessThan(1e-6)
    const p = evalRealPoint(spec.real, K, 0.7)
    expect(p.z).toBeCloseTo(reconstruct(spec, K).zs[Math.round((0.7 / (2 * Math.PI)) * 256)], 1)
  })
  it('flat contours stay 2D with zero depth coefficients', () => {
    const spec = computeSpectrum(resampleUniform(square(2), 64))
    expect(spec.is3D).toBe(false)
    expect(spec.real.e.every((v) => v === 0)).toBe(true)
  })
})
