import type { Point } from '@/core/types/epicycle'

const SHAPE_SELECTOR = 'path, polygon, polyline, circle, ellipse, rect, line'

/**
 * Extract the longest closed-ish contour from an SVG document using the
 * browser's own geometry engine (getTotalLength / getPointAtLength).
 * Transforms are honoured through getCTM(). Returns points in SVG user units.
 */
export function extractSvgContour(svgText: string, samples = 1024): Point[] {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const parserError = doc.querySelector('parsererror')
  if (parserError) throw new Error('Invalid SVG file')
  const root = doc.documentElement as unknown as SVGSVGElement
  if (root.tagName.toLowerCase() !== 'svg') throw new Error('Not an SVG document')

  // Mount offscreen so geometry APIs work.
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:1000px;height:1000px;opacity:0;pointer-events:none'
  const svg = document.importNode(root, true) as SVGSVGElement
  host.appendChild(svg)
  document.body.appendChild(host)

  try {
    const shapes = Array.from(svg.querySelectorAll<SVGGeometryElement>(SHAPE_SELECTOR)).filter(
      (el) => typeof el.getTotalLength === 'function',
    )
    if (shapes.length === 0) throw new Error('No path, polygon or circle elements found in SVG')

    let best: SVGGeometryElement | null = null
    let bestLen = 0
    for (const el of shapes) {
      let len = 0
      try {
        len = el.getTotalLength()
      } catch {
        len = 0
      }
      if (len > bestLen) {
        bestLen = len
        best = el
      }
    }
    if (!best || bestLen === 0) throw new Error('SVG shapes have zero length')

    const ctm = best.getCTM()
    const pts: Point[] = []
    const svgPoint = svg.createSVGPoint()
    for (let i = 0; i < samples; i++) {
      const p = best.getPointAtLength((i / samples) * bestLen)
      svgPoint.x = p.x
      svgPoint.y = p.y
      const q = ctm ? svgPoint.matrixTransform(ctm) : svgPoint
      pts.push({ x: q.x, y: q.y })
    }
    return pts
  } finally {
    host.remove()
  }
}
