import type { Harmonic, RealSeries } from '@/core/types/epicycle'

const fmt = (v: number, digits = 4): string => {
  if (Math.abs(v) < 0.5 * 10 ** -digits) return '0'
  const s = v.toFixed(digits)
  return s.replace(/\.?0+$/, '')
}

const signed = (v: number, digits = 4) => (v < 0 ? `- ${fmt(-v, digits)}` : `+ ${fmt(v, digits)}`)

/** LaTeX for the dual real series, truncated to K terms (displays at most `show` terms). */
export function realSeriesLatex(series: RealSeries, K: number, show = 6, digits = 3, is3D = false): { x: string; y: string; z?: string } {
  const build = (A: Float64Array, B: Float64Array, name: string) => {
    let s = `${name}(t) = ${fmt(A[0] / 2, digits)}`
    const kMax = Math.min(K, series.kMax)
    const limit = Math.min(kMax, show)
    for (let k = 1; k <= limit; k++) {
      const arg = k === 1 ? 't' : `${k}t`
      if (Math.abs(A[k]) >= 0.5 * 10 ** -digits) s += ` ${signed(A[k], digits)}\\cos(${arg})`
      if (Math.abs(B[k]) >= 0.5 * 10 ** -digits) s += ` ${signed(B[k], digits)}\\sin(${arg})`
    }
    const names = { x: ['a', 'b'], y: ['c', 'd'], z: ['e', 'f'] }[name as 'x' | 'y' | 'z']!
    if (kMax > show) s += ` + \\cdots + \\big(${names[0]}_{${kMax}}\\cos(${kMax}t) + ${names[1]}_{${kMax}}\\sin(${kMax}t)\\big)`
    return s
  }
  const out: { x: string; y: string; z?: string } = { x: build(series.a, series.b, 'x'), y: build(series.c, series.d, 'y') }
  if (is3D) out.z = build(series.e, series.f, 'z')
  return out
}

/** LaTeX for the complex form, listing the largest `show` terms. */
export function complexSeriesLatex(harmonics: Harmonic[], show = 6, digits = 3): string {
  const terms = [...harmonics].sort((a, b) => b.radius - a.radius).slice(0, show)
  let s = 'z(t) = '
  terms.forEach((h, i) => {
    const r = fmt(h.radius, digits)
    const ph = fmt(h.phase, digits)
    const exp = h.k === 0 ? '' : `e^{${h.k === 1 ? '' : h.k === -1 ? '-' : h.k}it}`
    const phasePart = Math.abs(h.phase) < 0.5 * 10 ** -digits ? '' : `e^{${ph}i}`
    s += `${i > 0 ? ' + ' : ''}${r}\\,${phasePart}${exp}`
  })
  if (harmonics.length > show) s += ' + \\cdots'
  return s
}

export const GENERAL_FORMS = {
  x: 'x(t) = \\frac{a_0}{2} + \\sum_{k=1}^{K} \\big(a_k \\cos(kt) + b_k \\sin(kt)\\big)',
  y: 'y(t) = \\frac{c_0}{2} + \\sum_{k=1}^{K} \\big(c_k \\cos(kt) + d_k \\sin(kt)\\big)',
  zDepth: 'z(t) = \\frac{e_0}{2} + \\sum_{k=1}^{K} \\big(e_k \\cos(kt) + f_k \\sin(kt)\\big)',
  z: 'z(t) = \\sum_{k=-K}^{K} c_k\\, e^{ikt}, \\quad c_k = \\frac{1}{N}\\sum_{n=0}^{N-1} z_n e^{-i 2\\pi k n / N}',
}

/** Full LaTeX document body for export. */
export function latexDocument(series: RealSeries, harmonics: Harmonic[], K: number, N: number, source: string, is3D = false): string {
  const real = realSeriesLatex(series, K, Math.min(K, 12), 5, is3D)
  const lines: string[] = []
  lines.push(`% EpicycleStudio export — ${source}`)
  lines.push(`% N = ${N} samples, K = ${K} harmonics, t ∈ [0, 2π)`)
  lines.push('')
  lines.push('\\section*{Dual real Fourier series}')
  lines.push('\\begin{align*}')
  lines.push(`${real.x} \\\\`)
  lines.push(real.z ? `${real.y} \\\\` : real.y)
  if (real.z) lines.push(real.z)
  lines.push('\\end{align*}')
  lines.push('')
  lines.push('\\section*{Complex exponential form}')
  lines.push('\\[')
  lines.push(complexSeriesLatex(harmonics, Math.min(harmonics.length, 12), 5))
  lines.push('\\]')
  lines.push('')
  lines.push('\\section*{Coefficient table}')
  lines.push(is3D ? '\\begin{tabular}{r r r r r r r}' : '\\begin{tabular}{r r r r r}')
  lines.push(is3D ? '$k$ & $a_k$ & $b_k$ & $c_k$ & $d_k$ & $e_k$ & $f_k$ \\\\ \\hline' : '$k$ & $a_k$ & $b_k$ & $c_k$ & $d_k$ \\\\ \\hline')
  for (let k = 0; k <= Math.min(K, series.kMax); k++) {
    const zc = is3D ? ` & ${fmt(series.e[k], 6)} & ${fmt(series.f[k], 6)}` : ''
    lines.push(`${k} & ${fmt(series.a[k], 6)} & ${fmt(series.b[k], 6)} & ${fmt(series.c[k], 6)} & ${fmt(series.d[k], 6)}${zc} \\\\`)
  }
  lines.push('\\end{tabular}')
  return lines.join('\n')
}

export function coefficientsJson(series: RealSeries, harmonics: Harmonic[], K: number, N: number, source: string, is3D = false): string {
  const kMax = Math.min(K, series.kMax)
  const real = []
  for (let k = 0; k <= kMax; k++) {
    const row: Record<string, number> = { k, a: series.a[k], b: series.b[k], c: series.c[k], d: series.d[k] }
    if (is3D) {
      row.e = series.e[k]
      row.f = series.f[k]
    }
    real.push(row)
  }
  const complex = harmonics.map((h) => ({ k: h.k, re: h.re, im: h.im, radius: h.radius, phase: h.phase }))
  return JSON.stringify(
    {
      generator: 'EpicycleStudio',
      source,
      N,
      K,
      domain: 't in [0, 2*pi)',
      conventions: {
        real: 'x(t) = a0/2 + sum a_k cos(kt) + b_k sin(kt); y(t) likewise with c_k, d_k' + (is3D ? '; z(t) with e_k, f_k' : ''),
        complex: 'z(t) = sum c_k e^{ikt}; radius = |c_k|, phase = arg(c_k)',
        axes: 'normalized, centered, y points down (screen convention)',
      },
      real,
      complex,
    },
    null,
    2,
  )
}
