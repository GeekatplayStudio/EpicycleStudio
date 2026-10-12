import { describe, expect, it } from 'vitest'
import { otsuThreshold, simplify, traceImageData } from './marchingSquares'
import { resampleUniform, normalize } from '@/core/math/arcLength'
import { computeSpectrum } from '@/core/math/dft'

/** Synthetic RGBA image: dark disc on a white background. */
function disc(w: number, h: number, r: number, invert = false) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inside = Math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2) < r
      const v = inside !== invert ? 20 : 240
      const i = (y * w + x) * 4
      data[i] = data[i + 1] = data[i + 2] = v
      data[i + 3] = 255
    }
  }
  return { width: w, height: h, data, colorSpace: 'srgb' } as unknown as ImageData
}

describe('bitmap tracer', () => {
  it('finds an Otsu threshold between the two modes', () => {
    const g = new Float32Array([20, 20, 20, 240, 240, 240])
    const t = otsuThreshold(g)
    expect(t).toBeGreaterThanOrEqual(20)
    expect(t).toBeLessThan(240)
  })

  it('traces a disc into a near-perfect circle', () => {
    const res = traceImageData(disc(120, 120, 40))
    expect(res.inverted).toBe(false)
    // boundary length ≈ circumference 2πr ≈ 251 px (8-connected walk is shorter than Euclidean)
    expect(res.points.length).toBeGreaterThan(200)
    expect(res.points.length).toBeLessThan(340)
    const spec = computeSpectrum(resampleUniform(normalize(res.points), 256))
    const r1 = spec.complex.find((h) => h.k === 1)!.radius
    const others = spec.complex.filter((h) => Math.abs(h.k) > 1).reduce((m, h) => Math.max(m, h.radius), 0)
    expect(r1).toBeGreaterThan(0.95)
    expect(others / r1).toBeLessThan(0.03)
  })

  it('auto-detects inverted polarity (light shape on dark background)', () => {
    const res = traceImageData(disc(100, 100, 30, true))
    expect(res.inverted).toBe(true)
    expect(res.points.length).toBeGreaterThan(150)
  })

  it('simplify keeps the loop shape with fewer points', () => {
    const res = traceImageData(disc(120, 120, 40))
    const s = simplify(res.points, 0.75)
    expect(s.length).toBeLessThan(res.points.length)
    expect(s.length).toBeGreaterThan(16)
  })
})
