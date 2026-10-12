import { useCallback } from 'react'
import { useStudio } from '@/store/useStudio'
import { extractSvgContour } from '@/core/tracer/svgParser'
import { imageToImageData, loadImage, simplify, traceImageData } from '@/core/tracer/marchingSquares'

/** Handles SVG and bitmap imports (files, drops, paste). */
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
        notify('Unsupported file. Use SVG, PNG, JPEG or WebP.')
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Import failed')
      }
    },
    [setPoints, notify],
  )

  return { importFile }
}
