import type { Contour, Harmonic } from '@/core/types/epicycle'

/**
 * Loopable animated SVG. Each epicycle is a nested <g> rotating about its own
 * origin; nesting composes the rotations exactly like the tip-to-tail chain.
 * The reconstructed path is drawn progressively with a dash animation.
 */
export function animatedSvg(
  harmonics: Harmonic[],
  approx: Contour,
  opts: { size?: number; duration?: number; colors?: { bg: string; circle: string; arm: string; trail: string } } = {},
): string {
  const size = opts.size ?? 800
  const dur = opts.duration ?? 12
  const c = opts.colors ?? { bg: '#0b0d12', circle: '#8b93a7', arm: '#e7e9ee', trail: '#f5b942' }
  const S = size * 0.3
  const cx = size / 2
  const cy = size / 2
  const f = (v: number) => (Math.round(v * 1000) / 1000).toString()

  // Path
  let d = ''
  let length = 0
  for (let i = 0; i < approx.n; i++) {
    const x = cx + approx.xs[i] * S
    const y = cy + approx.ys[i] * S
    d += (i === 0 ? 'M' : 'L') + f(x) + ' ' + f(y)
    if (i > 0) length += Math.hypot(x - (cx + approx.xs[i - 1] * S), y - (cy + approx.ys[i - 1] * S))
  }
  d += 'Z'
  length += Math.hypot(approx.xs[0] - approx.xs[approx.n - 1], approx.ys[0] - approx.ys[approx.n - 1]) * S

  // Nested chain
  let open = ''
  let close = ''
  for (const h of harmonics) {
    const r = h.radius * S
    const deg0 = (h.phase * 180) / Math.PI
    const deg1 = deg0 + 360 * h.k
    open += `<g>`
    if (h.k !== 0) {
      open += `<g><animateTransform attributeName="transform" type="rotate" from="${f(deg0)}" to="${f(deg1)}" dur="${dur}s" repeatCount="indefinite"/>`
    } else {
      open += `<g transform="rotate(${f(deg0)})">`
    }
    open += `<circle r="${f(r)}" fill="none" stroke="${c.circle}" stroke-opacity="0.45" stroke-width="1"/>`
    open += `<line x1="0" y1="0" x2="${f(r)}" y2="0" stroke="${c.arm}" stroke-width="1.2"/>`
    open += `<g transform="translate(${f(r)} 0)">`
    close = `</g></g></g>` + close
  }
  const pen = `<circle r="3" fill="${c.arm}"/>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <!-- EpicycleStudio · Geekatplay Studio — loopable Fourier epicycles -->
  <rect width="100%" height="100%" fill="${c.bg}"/>
  <path d="${d}" fill="none" stroke="${c.trail}" stroke-width="2" stroke-linejoin="round"
        stroke-dasharray="${f(length)} ${f(length)}" stroke-dashoffset="${f(length)}">
    <animate attributeName="stroke-dashoffset" from="${f(length)}" to="0" dur="${dur}s" repeatCount="indefinite"/>
  </path>
  <g transform="translate(${cx} ${cy})">
    ${open}${pen}${close}
  </g>
</svg>
`
}
