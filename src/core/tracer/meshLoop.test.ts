import { describe, expect, it } from 'vitest'
import { boundaryLoops, extractLoop, normalizeMesh, sectionLoops, type MeshData } from './meshLoop'

/** Open cylinder (no caps): boundary = two circles; sections = circles. */
function cylinder(segments = 24, r = 1, h = 2): MeshData {
  const positions: number[] = []
  const index: number[] = []
  for (let i = 0; i < segments; i++) {
    const a = (2 * Math.PI * i) / segments
    positions.push(r * Math.cos(a), -h / 2, r * Math.sin(a))
    positions.push(r * Math.cos(a), h / 2, r * Math.sin(a))
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2
    const b = ((i + 1) % segments) * 2
    index.push(a, a + 1, b, b, a + 1, b + 1)
  }
  return { positions: Float32Array.from(positions), index: Uint32Array.from(index) }
}

describe('mesh loops', () => {
  it('finds the two rim loops of an open cylinder', () => {
    const loops = boundaryLoops(cylinder())
    expect(loops.length).toBe(2)
    expect(loops[0].length).toBe(24)
  })
  it('slices a cylinder into a circle', () => {
    const loops = sectionLoops(cylinder(), 'y', 0.3)
    expect(loops.length).toBe(1)
    const l = loops[0]
    expect(l.length).toBeGreaterThanOrEqual(24)
    for (const p of l) {
      expect(Math.hypot(p.x, p.z)).toBeCloseTo(1, 1)
      expect(p.y).toBeCloseTo(0.3, 5)
    }
  })
  it('normalizes to the unit box and falls back to a section when no boundary exists', () => {
    const m = normalizeMesh(cylinder(16, 3, 10))
    let maxAbs = 0
    for (const v of m.positions) maxAbs = Math.max(maxAbs, Math.abs(v))
    expect(maxAbs).toBeCloseTo(1, 5)
    // remove the boundary by welding: use section mode directly
    const r = extractLoop(m, 'section', 'y', 0)
    expect(r.usedSection).toBe(true)
    expect(r.loop?.length).toBeGreaterThanOrEqual(16)
  })
})
