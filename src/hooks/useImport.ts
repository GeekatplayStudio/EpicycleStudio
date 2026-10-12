import { useCallback } from 'react'
import { useStudio } from '@/store/useStudio'
import type { Point3 } from '@/core/types/epicycle'
import { extractSvgContour } from '@/core/tracer/svgParser'
import { imageToImageData, loadImage, simplify, traceImageData } from '@/core/tracer/marchingSquares'

/** Parse JSON ([[x,y,z]], [{x,y,z}], {points: …}) or CSV (x,y[,z] per row). */
export function parsePointFile(text: string): Point3[] {
  const trimmed = text.trim()
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0)
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const raw: unknown = JSON.parse(trimmed)
    const arr = Array.isArray(raw) ? raw : (raw as { points?: unknown }).points
    if (!Array.isArray(arr)) return []
    return arr
      .map((p): Point3 | null => {
        if (Array.isArray(p) && p.length >= 2) return { x: num(p[0]), y: num(p[1]), z: num(p[2] ?? 0) }
        if (p && typeof p === 'object' && 'x' in p && 'y' in p) {
          const o = p as { x: unknown; y: unknown; z?: unknown }
          return { x: num(o.x), y: num(o.y), z: num(o.z ?? 0) }
        }
        return null
      })
      .filter((p): p is Point3 => p !== null)
  }
  return trimmed
    .split(/\r?\n/)
    .map((l) => l.split(/[,;\t ]+/).map((v) => v.trim()))
    .filter((c) => c.length >= 2 && Number.isFinite(Number(c[0])) && Number.isFinite(Number(c[1])))
    .map((c) => ({ x: Number(c[0]), y: Number(c[1]), z: Number(c[2] ?? 0) || 0 }))
}

/** Handles SVG, bitmap and point-list imports (files, drops, paste). */
export function useImport() {
  const setPoints = useStudio((s) => s.setPoints)
  const notify = useStudio((s) => s.notify)

  const importFile = useCallback(
    async (file: File | Blob, name = 'Import') => {
      try {
        const type = file.type || ''
        const fileName = 'name' in file ? (file as File).name : name
        if (type === 'image/svg+xml' || fileName.toLowerCase().endsWith('.svg')) {
          const text = await file.text()
          const pts = extractSvgContour(text, 1024)
          setPoints(pts, fileName.replace(/\.svg$/i, ''))
          notify(`Imported SVG · ${pts.length} path samples`)
          return
        }
        if (type.startsWith('image/')) {
          const img = await loadImage(file)
          const data = imageToImageData(img, 480)
          const res = traceImageData(data)
          const pts = simplify(res.points, 0.6)
          setPoints(pts, fileName.replace(/\.[a-z0-9]+$/i, ''), { smooth: true })
          notify(`Traced silhouette · ${res.points.length} boundary px · threshold ${res.threshold}${res.inverted ? ' · inverted' : ''}`)
          return
        }
        if (type === 'application/json' || /\.json$/i.test(fileName) || type === 'text/csv' || /\.csv$/i.test(fileName)) {
          const text = await file.text()
          const pts = parsePointFile(text)
          if (pts.length < 3) throw new Error('Need at least 3 points: JSON [[x,y,z], …], [{x,y,z}, …] or CSV x,y,z rows')
          const is3D = pts.some((p) => p.z !== 0)
          setPoints(pts, fileName.replace(/\.(json|csv)$/i, ''), { is3D })
          notify(`Imported ${pts.length} ${is3D ? '3D' : '2D'} points`)
          return
        }
        notify('Unsupported file. Use SVG, PNG, JPEG, WebP, JSON or CSV.')
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Import failed')
      }
    },
    [setPoints, notify],
  )

  return { importFile }
}
