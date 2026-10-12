import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useStudio } from '@/store/useStudio'
import type { SpectrumData } from '@/store/useSpectrum'
import { evalComplexChain, evalDepth, sumRadii } from '@/core/math/evaluate'
import type { Point3 } from '@/core/types/epicycle'
import type { RealTerm } from '@/core/math/evaluate'
import { canvasRegistry } from '@/components/Canvas/canvasRegistry'
import { CHAIN_GAP, sceneBox, zAnchorX } from '@/components/Canvas/sceneLayout'

/**
 * The Fourier formulas rendered in 3D with three.js.
 *
 * Orthogonal split: the x(t) chain rotates in the X–Z plane above the curve,
 * the y(t) chain in the Y–Z plane to its left, and (for space curves) the
 * z(t) chain in the Y–Z plane to its right. Each chain's projection onto its
 * axis is exactly its real series; the three projection lines meet at the pen.
 * Complex chain: the nested (x, y) chain in the X–Y plane plus the z chain.
 * Optionally the trace is extruded along Z with time instead of depth.
 */
export function Epicycle3D({ data }: { data: SpectrumData }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    const host = hostRef.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    host.appendChild(renderer.domElement)
    renderer.domElement.className = 'absolute inset-0 h-full w-full'
    canvasRegistry.set(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100)
    camera.position.set(2.6, -2.2, 3.4)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08

    const grid = new THREE.GridHelper(8, 32, 0x2a3040, 0x1f2430)
    grid.rotation.x = Math.PI / 2
    grid.position.z = -0.001
    ;(grid.material as THREE.LineBasicMaterial).transparent = true
    scene.add(grid)

    const circlePts: THREE.Vector3[] = []
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2
      circlePts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0))
    }
    const circleGeo = new THREE.BufferGeometry().setFromPoints(circlePts)

    const circleMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.45 })
    const armMat = new THREE.LineBasicMaterial()
    const projMat = new THREE.LineDashedMaterial({ dashSize: 0.05, gapSize: 0.05, transparent: true, opacity: 0.8 })
    const trailMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.95 })
    const ghostMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.6 })

    const circles: THREE.Line[] = []
    const circleGroup = new THREE.Group()
    scene.add(circleGroup)
    const ensureCircles = (count: number) => {
      while (circles.length < count) {
        const l = new THREE.Line(circleGeo, circleMat)
        circleGroup.add(l)
        circles.push(l)
      }
      for (let i = 0; i < circles.length; i++) circles[i].visible = i < count
    }

    const makeLine = <T extends THREE.Line>(ctor: new (g: THREE.BufferGeometry, m: THREE.Material) => T, mat: THREE.Material): T => {
      const l = new ctor(new THREE.BufferGeometry(), mat)
      scene.add(l)
      return l
    }
    const armLines = [makeLine(THREE.Line, armMat), makeLine(THREE.Line, armMat), makeLine(THREE.Line, armMat)]
    const proj = makeLine(THREE.LineSegments, projMat)
    const trail = makeLine(THREE.Line, trailMat)
    const ghost = makeLine(THREE.LineLoop, ghostMat)
    const pen = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 16), new THREE.MeshBasicMaterial())
    scene.add(pen)
    const EMPTY = [new THREE.Vector3(), new THREE.Vector3()]

    // --- imported model wireframe -------------------------------------------
    const modelMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.18 })
    const modelLines = new THREE.LineSegments(new THREE.BufferGeometry(), modelMat)
    scene.add(modelLines)
    let modelRef: unknown = null
    const sectionPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }),
    )
    scene.add(sectionPlane)

    // --- 3D sketching -------------------------------------------------------
    const drawPlaneMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 3.2),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }),
    )
    const drawGrid = new THREE.GridHelper(3.2, 16)
    drawGrid.rotation.x = Math.PI / 2
    ;(drawGrid.material as THREE.LineBasicMaterial).transparent = true
    ;(drawGrid.material as THREE.LineBasicMaterial).opacity = 0.25
    drawPlaneMesh.add(drawGrid)
    scene.add(drawPlaneMesh)
    const strokeMat = new THREE.LineBasicMaterial()
    const stroke = new THREE.Line(new THREE.BufferGeometry(), strokeMat)
    scene.add(stroke)
    const mathPlane = new THREE.Plane()
    const raycaster = new THREE.Raycaster()
    const strokePts: THREE.Vector3[] = []
    let sketching = false

    const updateDrawPlane = () => {
      const s = useStudio.getState()
      const normal = new THREE.Vector3()
      if (s.drawPlane === 'screen') camera.getWorldDirection(normal).negate()
      else if (s.drawPlane === 'xy') normal.set(0, 0, 1)
      else if (s.drawPlane === 'xz') normal.set(0, 1, 0)
      else normal.set(1, 0, 0)
      const origin = controls.target.clone().add(normal.clone().multiplyScalar(s.drawOffset))
      mathPlane.setFromNormalAndCoplanarPoint(normal, origin)
      drawPlaneMesh.position.copy(origin)
      drawPlaneMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    }
    const pointOnPlane = (e: PointerEvent): THREE.Vector3 | null => {
      const r = renderer.domElement.getBoundingClientRect()
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      const hit = new THREE.Vector3()
      return raycaster.ray.intersectPlane(mathPlane, hit) ? hit : null
    }
    const onDown = (e: PointerEvent) => {
      if (useStudio.getState().tool !== 'draw') return
      if (e.button !== 0) return
      e.preventDefault()
      updateDrawPlane()
      const p = pointOnPlane(e)
      if (!p) return
      renderer.domElement.setPointerCapture(e.pointerId)
      sketching = true
      strokePts.length = 0
      strokePts.push(p)
    }
    const onMove = (e: PointerEvent) => {
      if (!sketching) return
      const p = pointOnPlane(e)
      if (!p) return
      const last = strokePts[strokePts.length - 1]
      if (last.distanceTo(p) > 0.004) strokePts.push(p)
      stroke.geometry.setFromPoints(strokePts)
    }
    const onUp = (e: PointerEvent) => {
      if (!sketching) return
      sketching = false
      renderer.domElement.releasePointerCapture(e.pointerId)
      const st = useStudio.getState()
      if (strokePts.length >= 8) {
        // close: snap when the stroke ends near its start
        if (strokePts[0].distanceTo(strokePts[strokePts.length - 1]) < 0.06) strokePts.pop()
        const pts: Point3[] = strokePts.map((v) => ({ x: v.x, y: -v.y, z: v.z }))
        const smooth = smooth3(pts, 2)
        if (st.drawAppend && st.rawPoints.length >= 3) st.appendPoints(smooth)
        else st.setPoints(smooth, '3D sketch', { is3D: true })
        st.setTool('view')
      }
      strokePts.length = 0
      stroke.geometry.setFromPoints(EMPTY)
    }
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointermove', onMove)
    renderer.domElement.addEventListener('pointerup', onUp)
    renderer.domElement.addEventListener('pointercancel', onUp)
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault())

    const resize = () => {
      const w = host.clientWidth || 1
      const h = host.clientHeight || 1
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    // World y is down in 2D; three.js y is up.
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, -y, z)

    let raf = 0
    let lastSig = ''
    let lastFit = ''
    const render = () => {
      raf = requestAnimationFrame(render)
      const s = useStudio.getState()
      const d = dataRef.current
      const dark = s.theme === 'dark'
      scene.background = new THREE.Color(dark ? '#0b0d12' : '#f6f7f9')
      ;(grid.material as THREE.LineBasicMaterial).opacity = dark ? 0.5 : 0.35
      circleMat.color.set(s.palette.circles)
      armMat.color.set(s.palette.arms)
      projMat.color.set(s.palette.projections)
      trailMat.color.set(s.palette.trail)
      ghostMat.color.set(s.palette.ghost)
      ;(pen.material as THREE.MeshBasicMaterial).color.set(s.palette.pen)

      // Sketch mode: orbit only with the right/middle button; show the plane.
      const drawing = s.tool === 'draw'
      controls.mouseButtons.LEFT = drawing ? null : THREE.MOUSE.ROTATE
      drawPlaneMesh.visible = drawing
      stroke.visible = drawing
      if (drawing) {
        updateDrawPlane()
        ;(drawPlaneMesh.material as THREE.MeshBasicMaterial).color.set(s.palette.trail)
        ;(drawGrid.material as THREE.LineBasicMaterial).color.set(s.palette.trail)
        strokeMat.color.set(s.palette.trail)
      }

      // Model wireframe + section plane.
      if (s.model !== modelRef) {
        modelRef = s.model
        if (s.model) {
          const pos: number[] = []
          const { positions, index } = s.model
          const seen = new Set<string>()
          for (let i = 0; i < index.length; i += 3) {
            for (let e = 0; e < 3; e++) {
              const a = index[i + e]
              const b = index[i + ((e + 1) % 3)]
              const k = a < b ? `${a}_${b}` : `${b}_${a}`
              if (seen.has(k)) continue
              seen.add(k)
              pos.push(positions[a * 3], -positions[a * 3 + 1], positions[a * 3 + 2], positions[b * 3], -positions[b * 3 + 1], positions[b * 3 + 2])
            }
          }
          modelLines.geometry.dispose()
          modelLines.geometry = new THREE.BufferGeometry()
          modelLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
        }
      }
      modelLines.visible = !!s.model && s.showModel
      modelMat.color.set(s.palette.circles)
      sectionPlane.visible = !!s.model && s.showModel && s.modelMode === 'section'
      if (sectionPlane.visible) {
        ;(sectionPlane.material as THREE.MeshBasicMaterial).color.set(s.palette.trail)
        const n = s.sectionAxis === 'x' ? new THREE.Vector3(1, 0, 0) : s.sectionAxis === 'y' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1)
        const off = s.sectionAxis === 'y' ? -s.sectionOffset : s.sectionOffset
        sectionPlane.position.copy(n.clone().multiplyScalar(off))
        sectionPlane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)
      }

      if (!d.hasShape) {
        controls.update()
        renderer.render(scene, camera)
        return
      }
      const t = s.t
      const depth = 2.2
      const extrude = s.extrudeTime
      const zOf = (tt: number, zDepth: number) => (extrude ? (tt / (2 * Math.PI)) * depth - depth / 2 : zDepth)

      // Curve geometry rebuilds only when its inputs change.
      const sig = `${d.contour.n}|${d.K}|${extrude}|${d.spectrum.complex[1]?.re}|${d.spectrum.complex[1]?.im}|${d.spectrum.real.e[1]}`
      if (sig !== lastSig) {
        lastSig = sig
        const g: THREE.Vector3[] = []
        for (let i = 0; i < d.contour.n; i++) g.push(V(d.contour.xs[i], d.contour.ys[i], zOf((2 * Math.PI * i) / d.contour.n, d.contour.zs[i])))
        ghost.geometry.setFromPoints(g)
        const a: THREE.Vector3[] = []
        for (let i = 0; i <= d.approx.n; i++) {
          const idx = i % d.approx.n
          a.push(V(d.approx.xs[idx], d.approx.ys[idx], zOf((2 * Math.PI * i) / d.approx.n, d.approx.zs[idx])))
        }
        trail.geometry.setFromPoints(a)
      }
      ghost.visible = s.layers.ghost
      trail.visible = s.layers.trail
      const upto = Math.max(2, Math.floor((t / (2 * Math.PI)) * d.approx.n) + 1)
      trail.geometry.setDrawRange(0, extrude ? upto : d.approx.n + 1)

      const sumRx = sumRadii(d.xTerms)
      const sumRy = sumRadii(d.yTerms)
      const sumRz = sumRadii(d.zTerms)
      const zDepth = d.is3D ? evalDepth(d.spectrum.real, d.K, t) : 0
      const zPen = zOf(t, zDepth)
      const armSets: THREE.Vector3[][] = [[], [], []]
      const projPts: THREE.Vector3[] = []
      let penPos: THREE.Vector3
      let ci = 0
      const placeCircle = (term: RealTerm, cx: number, cy: number, cz: number, plane: 'xz' | 'yz') => {
        const c = circles[ci++]
        c.position.copy(V(cx, cy, cz))
        c.scale.setScalar(term.radius)
        c.rotation.set(0, 0, 0)
        if (plane === 'xz') c.rotation.x = Math.PI / 2
        else c.rotation.y = Math.PI / 2
      }

      if (s.mode === 'split') {
        ensureCircles(d.xTerms.length + d.yTerms.length + d.zTerms.length)
        const a0 = d.spectrum.real.a[0] / 2
        const c0 = d.spectrum.real.c[0] / 2
        const yPlane = -(1 + CHAIN_GAP + sumRx)
        const xPlane = -(1 + CHAIN_GAP + sumRy)

        // x chain: X–Z plane, projects onto X.
        let px = a0
        let pz = 0
        armSets[0].push(V(px, yPlane, pz))
        for (const term of d.xTerms) {
          placeCircle(term, px, yPlane, pz, 'xz')
          const ang = term.k * t - term.phase
          px += term.radius * Math.cos(ang)
          pz += term.radius * Math.sin(ang)
          armSets[0].push(V(px, yPlane, pz))
        }
        const xTip = V(px, yPlane, pz)

        // y chain: Y–Z plane, projects onto Y.
        let py = c0
        let qz = 0
        armSets[1].push(V(xPlane, py, qz))
        for (const term of d.yTerms) {
          placeCircle(term, xPlane, py, qz, 'yz')
          const ang = term.k * t - term.phase
          py += term.radius * Math.cos(ang)
          qz += -term.radius * Math.sin(ang)
          armSets[1].push(V(xPlane, py, qz))
        }
        const yTip = V(xPlane, py, qz)

        penPos = V(px, py, zPen)
        if (s.layers.projections) {
          projPts.push(xTip, V(px, yPlane, zPen), V(px, yPlane, zPen), penPos, yTip, V(xPlane, py, zPen), V(xPlane, py, zPen), penPos)
        }
      } else {
        ensureCircles(d.harmonics.length + d.zTerms.length)
        const chain = evalComplexChain(d.harmonics, t)
        armSets[0].push(V(chain.centers[0]?.x ?? 0, chain.centers[0]?.y ?? 0, zPen))
        for (let i = 0; i < chain.tips.length; i++) {
          const c = circles[ci++]
          c.position.copy(V(chain.centers[i].x, chain.centers[i].y, zPen))
          c.scale.setScalar(chain.radii[i])
          c.rotation.set(0, 0, 0)
          armSets[0].push(V(chain.tips[i].x, chain.tips[i].y, zPen))
        }
        penPos = V(chain.pen.x, chain.pen.y, zPen)
      }

      // z chain (space curves): Y–Z plane to the right, projects onto Z.
      if (d.zTerms.length > 0 && !extrude) {
        const xr = zAnchorX(sumRz)
        const e0 = d.spectrum.real.e[0] / 2
        let ry = 0
        let rz = e0
        armSets[2].push(V(xr, ry, rz))
        for (const term of d.zTerms) {
          placeCircle(term, xr, ry, rz, 'yz')
          const ang = term.k * t - term.phase
          ry += -term.radius * Math.sin(ang)
          rz += term.radius * Math.cos(ang)
          armSets[2].push(V(xr, ry, rz))
        }
        const zTip = V(xr, ry, rz)
        if (s.layers.projections) projPts.push(zTip, V(xr, penPos.y * -1, rz), V(xr, penPos.y * -1, rz), penPos)
      }

      circleGroup.visible = s.layers.circles
      armSets.forEach((pts, i) => {
        armLines[i].visible = s.layers.arms && pts.length > 1
        armLines[i].geometry.setFromPoints(pts.length > 1 ? pts : EMPTY)
      })
      proj.visible = s.layers.projections && projPts.length > 0
      proj.geometry.setFromPoints(projPts.length ? projPts : EMPTY)
      proj.computeLineDistances()
      pen.position.copy(penPos)

      // Fit the camera when the layout changes, then leave orbiting to the user.
      const fitSig = `${s.mode}|${d.K}|${d.contour.n}|${d.is3D}|${s.sourceName}`
      if (fitSig !== lastFit) {
        lastFit = fitSig
        const box = sceneBox(s.mode, sumRx, sumRy, sumRadii(d.harmonics), sumRz)
        const cx = (box.minX + box.maxX) / 2
        const cy = -(box.minY + box.maxY) / 2
        const extent = Math.max(box.maxX - box.minX, box.maxY - box.minY, d.is3D ? 2.4 : 0)
        const dist = (extent / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 1.15
        controls.target.set(cx, cy, 0)
        camera.position.set(cx + dist * 0.42, cy - dist * 0.38, dist * 0.82)
        camera.near = dist / 100
        camera.far = dist * 20
        camera.updateProjectionMatrix()
      }

      controls.update()
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointermove', onMove)
      renderer.domElement.removeEventListener('pointerup', onUp)
      renderer.domElement.removeEventListener('pointercancel', onUp)
      modelLines.geometry.dispose()
      stroke.geometry.dispose()
      controls.dispose()
      circleGeo.dispose()
      for (const l of [...armLines, proj, trail, ghost]) l.geometry.dispose()
      renderer.dispose()
      if (canvasRegistry.get() === renderer.domElement) canvasRegistry.set(null)
      host.removeChild(renderer.domElement)
    }
  }, [])

  const tool = useStudio((s) => s.tool)
  return (
    <div ref={hostRef} className={`absolute inset-0 h-full w-full ${tool === 'draw' ? '[&>canvas]:cursor-crosshair' : ''}`}>
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-line bg-bg-2/80 px-3 py-1 font-mono text-[11px] text-fg-3 backdrop-blur">
        drag to orbit · wheel to zoom
      </div>
    </div>
  )
}

/** Closed-loop moving average in 3D. */
function smooth3(pts: Point3[], passes = 1): Point3[] {
  let out = pts
  for (let p = 0; p < passes; p++) {
    const m = out.length
    out = out.map((_, i) => {
      const a = out[(i - 1 + m) % m]
      const b = out[i]
      const c = out[(i + 1) % m]
      return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3, z: (a.z + b.z + c.z) / 3 }
    })
  }
  return out
}
