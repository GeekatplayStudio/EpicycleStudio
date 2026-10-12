import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useStudio } from '@/store/useStudio'
import type { SpectrumData } from '@/store/useSpectrum'
import { evalComplexChain, sumRadii } from '@/core/math/evaluate'
import type { RealTerm } from '@/core/math/evaluate'
import { canvasRegistry } from '@/components/Canvas/canvasRegistry'
import { CHAIN_GAP, sceneBox } from '@/components/Canvas/sceneLayout'

/**
 * The same Fourier formula rendered in 3D with three.js.
 *
 * Orthogonal split mode: the x(t) chain rotates in the X–Z plane and the y(t)
 * chain in the Y–Z plane, so each chain's projection onto its axis is exactly
 * the real series. The pen moves in the X–Y plane where the two projections
 * meet. Complex chain mode nests the rotations in the X–Y plane. Optionally the
 * trace is extruded along Z (time), turning the closed curve into a helix.
 *
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
    controls.target.set(0, 0, 0)

    const grid = new THREE.GridHelper(8, 32, 0x2a3040, 0x1f2430)
    grid.rotation.x = Math.PI / 2
    grid.position.z = -0.001
    scene.add(grid)

    // Reusable unit circle geometry.
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

    const armGeo = new THREE.BufferGeometry()
    const arms = new THREE.Line(armGeo, armMat)
    scene.add(arms)
    const arm2Geo = new THREE.BufferGeometry()
    const arms2 = new THREE.Line(arm2Geo, armMat)
    scene.add(arms2)
    const projGeo = new THREE.BufferGeometry()
    const proj = new THREE.LineSegments(projGeo, projMat)
    scene.add(proj)
    const trailGeo = new THREE.BufferGeometry()
    const trail = new THREE.Line(trailGeo, trailMat)
    scene.add(trail)
    const ghostGeo = new THREE.BufferGeometry()
    const ghost = new THREE.LineLoop(ghostGeo, ghostMat)
    scene.add(ghost)
    const pen = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 16), new THREE.MeshBasicMaterial())
    scene.add(pen)

    const ensureCircles = (count: number) => {
      while (circles.length < count) {
        const l = new THREE.Line(circleGeo, circleMat)
        circleGroup.add(l)
        circles.push(l)
      }
      for (let i = 0; i < circles.length; i++) circles[i].visible = i < count
    }

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
    const toV = (x: number, y: number, z: number) => new THREE.Vector3(x, -y, z)

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
      ;(grid.material as THREE.LineBasicMaterial).transparent = true
      circleMat.color.set(s.palette.circles)
      armMat.color.set(s.palette.arms)
      projMat.color.set(s.palette.projections)
      trailMat.color.set(s.palette.trail)
      ghostMat.color.set(s.palette.ghost)
      ;(pen.material as THREE.MeshBasicMaterial).color.set(s.palette.pen)

      if (!d.hasShape) {
        renderer.render(scene, camera)
        return
      }
      const t = s.t
      const depth = 2.2 // z extent for time extrusion
      const zOf = (tt: number) => (s.extrudeTime ? (tt / (2 * Math.PI)) * depth - depth / 2 : 0)

      // Static-ish geometry: ghost + trail only rebuild when inputs change.
      const sig = `${d.contour.n}|${d.K}|${s.extrudeTime}|${d.spectrum.complex[1]?.re}|${d.spectrum.complex[1]?.im}`
      if (sig !== lastSig) {
        lastSig = sig
        const g: THREE.Vector3[] = []
        for (let i = 0; i < d.contour.n; i++) g.push(toV(d.contour.xs[i], d.contour.ys[i], zOf((2 * Math.PI * i) / d.contour.n)))
        ghostGeo.setFromPoints(g)
        const a: THREE.Vector3[] = []
        for (let i = 0; i <= d.approx.n; i++) {
          const idx = i % d.approx.n
          a.push(toV(d.approx.xs[idx], d.approx.ys[idx], zOf((2 * Math.PI * i) / d.approx.n)))
        }
        trailGeo.setFromPoints(a)
      }
      ghost.visible = s.layers.ghost
      trail.visible = s.layers.trail
      // Draw-range makes the trail grow with t.
      const upto = Math.max(2, Math.floor((t / (2 * Math.PI)) * d.approx.n) + 1)
      trail.geometry.setDrawRange(s.extrudeTime ? 0 : 0, s.extrudeTime ? upto : d.approx.n + 1)

      const armPts: THREE.Vector3[] = []
      let arm2Pts: THREE.Vector3[] = []
      const projPts: THREE.Vector3[] = []
      let penPos: THREE.Vector3
      const zPen = zOf(t)

      if (s.mode === 'split') {
        const sumRx = sumRadii(d.xTerms)
        const sumRy = sumRadii(d.yTerms)
        const a0 = d.spectrum.real.a[0] / 2
        const c0 = d.spectrum.real.c[0] / 2
        const yPlane = -(1 + CHAIN_GAP + sumRx) // world y for x-chain (above the drawing)
        const xPlane = -(1 + CHAIN_GAP + sumRy) // world x for y-chain (left of the drawing)
        ensureCircles(d.xTerms.length + d.yTerms.length)
        let ci = 0

        // x chain: rotates in the X–Z plane, anchored at (a0, yPlane, 0)
        let px = a0
        let pz = 0
        armPts.push(toV(px, yPlane, pz))
        const placeCircle = (term: RealTerm, cx: number, cy: number, cz: number, axis: 'x' | 'y') => {
          const c = circles[ci++]
          c.position.copy(toV(cx, cy, cz))
          c.scale.setScalar(term.radius)
          c.rotation.set(0, 0, 0)
          if (axis === 'x') c.rotation.x = Math.PI / 2 // circle in X–Z plane
          else c.rotation.y = Math.PI / 2 // circle in Y–Z plane
        }
        for (const term of d.xTerms) {
          placeCircle(term, px, yPlane, pz, 'x')
          const ang = term.k * t - term.phase
          px += term.radius * Math.cos(ang)
          pz += term.radius * Math.sin(ang)
          armPts.push(toV(px, yPlane, pz))
        }
        const xTip = toV(px, yPlane, pz)

        // y chain: rotates in the Y–Z plane, anchored at (xPlane, c0, 0)
        let py = c0
        let qz = 0
        const yArm: THREE.Vector3[] = [toV(xPlane, py, qz)]
        for (const term of d.yTerms) {
          placeCircle(term, xPlane, py, qz, 'y')
          const ang = term.k * t - term.phase
          py += term.radius * Math.cos(ang)
          qz += -term.radius * Math.sin(ang)
          yArm.push(toV(xPlane, py, qz))
        }
        const yTip = toV(xPlane, py, qz)
        arm2Pts = yArm

        penPos = toV(px, py, zPen)
        if (s.layers.projections) {
          projPts.push(xTip, toV(px, yPlane, 0), toV(px, yPlane, 0), penPos, yTip, toV(xPlane, py, 0), toV(xPlane, py, 0), penPos)
        }
      } else {
        ensureCircles(d.harmonics.length)
        const chain = evalComplexChain(d.harmonics, t)
        armPts.push(toV(chain.centers[0]?.x ?? 0, chain.centers[0]?.y ?? 0, zPen))
        for (let i = 0; i < chain.tips.length; i++) {
          const c = circles[i]
          c.position.copy(toV(chain.centers[i].x, chain.centers[i].y, zPen))
          c.scale.setScalar(chain.radii[i])
          c.rotation.set(0, 0, 0)
          armPts.push(toV(chain.tips[i].x, chain.tips[i].y, zPen))
        }
        penPos = toV(chain.pen.x, chain.pen.y, zPen)
      }

      circleGroup.visible = s.layers.circles
      arms.visible = s.layers.arms
      armGeo.setFromPoints(armPts)
      arms2.visible = s.layers.arms && arm2Pts.length > 0
      arm2Geo.setFromPoints(arm2Pts.length ? arm2Pts : [new THREE.Vector3(), new THREE.Vector3()])

      // Fit the camera when the scene layout changes (mode / extent), then leave orbiting to the user.
      const fitSig = `${s.mode}|${d.K}|${d.contour.n}`
      if (fitSig !== lastFit) {
        lastFit = fitSig
        const box = sceneBox(s.mode, sumRadii(d.xTerms), sumRadii(d.yTerms), sumRadii(d.harmonics))
        const cx = (box.minX + box.maxX) / 2
        const cy = -(box.minY + box.maxY) / 2
        const extent = Math.max(box.maxX - box.minX, box.maxY - box.minY)
        const dist = (extent / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 1.15
        controls.target.set(cx, cy, 0)
        camera.position.set(cx + dist * 0.42, cy - dist * 0.38, dist * 0.82)
        camera.near = dist / 100
        camera.far = dist * 20
        camera.updateProjectionMatrix()
      }
      proj.visible = s.layers.projections && projPts.length > 0
      projGeo.setFromPoints(projPts.length ? projPts : [new THREE.Vector3(), new THREE.Vector3()])
      proj.computeLineDistances()
      pen.position.copy(penPos)

      controls.update()
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      circleGeo.dispose()
      armGeo.dispose()
      arm2Geo.dispose()
      projGeo.dispose()
      trailGeo.dispose()
      ghostGeo.dispose()
      renderer.dispose()
      if (canvasRegistry.get() === renderer.domElement) canvasRegistry.set(null)
      host.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div ref={hostRef} className="absolute inset-0 h-full w-full">
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-line bg-bg-2/80 px-3 py-1 font-mono text-[11px] text-fg-3 backdrop-blur">
        drag to orbit · wheel to zoom
      </div>
    </div>
  )
}
