import { describe, expect, it } from 'vitest'
import { loadModelFile } from './modelLoader'
import { boundaryLoops, normalizeMesh } from './meshLoop'

/** Open 3×3 quad grid as OBJ: boundary is the outer square (12 vertices). */
const OBJ = (() => {
  const lines: string[] = []
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) lines.push(`v ${x} ${y} ${Math.sin(x) * 0.2}`)
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      const a = y * 4 + x + 1
      lines.push(`f ${a} ${a + 1} ${a + 5} ${a + 4}`)
    }
  }
  return lines.join('\n')
})()

describe('model loader', () => {
  it('parses OBJ into an indexed mesh and finds its outer boundary', async () => {
    const file = new File([OBJ], 'grid.obj')
    const mesh = normalizeMesh(await loadModelFile(file))
    expect(mesh.positions.length / 3).toBe(16)
    expect(mesh.index.length).toBe(18 * 3)
    const loops = boundaryLoops(mesh)
    expect(loops.length).toBe(1)
    expect(loops[0].length).toBe(12)
  })
})
