import type { BufferGeometry, Mesh, Object3D } from 'three'
import type { MeshData } from './meshLoop'

/**
 * Load OBJ, STL, GLB or GLTF files into a single indexed triangle mesh in
 * world convention (y down). three.js loaders are imported on demand.
 */
export async function loadModelFile(file: File): Promise<MeshData> {
  const { mergeVertices, mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js')
  const name = file.name.toLowerCase()
  const geometries: BufferGeometry[] = []

  const collect = (obj: Object3D) => {
    obj.updateMatrixWorld(true)
    obj.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh || !mesh.geometry) return
      let g = mesh.geometry.clone() as BufferGeometry
      if (g.index) g = g.toNonIndexed()
      g.applyMatrix4(mesh.matrixWorld)
      for (const attr of Object.keys(g.attributes)) if (attr !== 'position') g.deleteAttribute(attr)
      g.morphAttributes = {}
      geometries.push(g)
    })
  }

  if (name.endsWith('.obj')) {
    const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js')
    collect(new OBJLoader().parse(await file.text()))
  } else if (name.endsWith('.stl')) {
    const { STLLoader } = await import('three/addons/loaders/STLLoader.js')
    const g = new STLLoader().parse(await file.arrayBuffer())
    for (const attr of Object.keys(g.attributes)) if (attr !== 'position') g.deleteAttribute(attr)
    geometries.push((g.index ? g.toNonIndexed() : g) as BufferGeometry)
  } else if (name.endsWith('.glb') || name.endsWith('.gltf')) {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js')
    const loader = new GLTFLoader()
    const gltf = await loader.parseAsync(await file.arrayBuffer(), '')
    collect(gltf.scene)
  } else {
    throw new Error('Unsupported model format. Use OBJ, STL, GLB or GLTF.')
  }
  if (geometries.length === 0) throw new Error('No triangle meshes found in the model.')

  const merged = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false)
  if (!merged) throw new Error('Could not merge model geometry.')
  const indexed = mergeVertices(merged, 1e-5)
  const pos = indexed.getAttribute('position').array as Float32Array
  const positions = new Float32Array(pos.length)
  for (let i = 0; i < pos.length; i += 3) {
    positions[i] = pos[i]
    positions[i + 1] = -pos[i + 1] // three y-up → world y-down
    positions[i + 2] = pos[i + 2]
  }
  const idx = indexed.index
  const index = idx ? Uint32Array.from(idx.array as ArrayLike<number>) : Uint32Array.from({ length: positions.length / 3 }, (_, i) => i)
  return { positions, index }
}
