import { useState } from 'react'
import type { SpectrumData } from '@/store/useSpectrum'
import { Segmented } from '@/components/ui/primitives'

const f = (v: number) => (Math.abs(v) < 5e-7 ? '0' : v.toFixed(5))

export function CoefficientTable({ data }: { data: SpectrumData }) {
  const [form, setForm] = useState<'real' | 'complex'>('real')
  const { real } = data.spectrum
  const rows = form === 'real' ? Array.from({ length: Math.min(data.K, real.kMax) + 1 }, (_, k) => k) : null

  return (
    <div className="flex flex-col gap-2">
      <Segmented
        size="sm"
        value={form}
        onChange={setForm}
        options={[
          { value: 'real', label: 'a b c d' },
          { value: 'complex', label: 'R φ' },
        ]}
      />
      <div className="max-h-64 overflow-auto rounded-lg border border-line">
        <table className="w-full border-collapse font-mono text-[11px] tabular-nums">
          <thead className="sticky top-0 bg-bg-2 text-fg-3">
            {form === 'real' ? (
              <tr>
                {['k', 'a_k', 'b_k', 'c_k', 'd_k'].map((h) => (
                  <th key={h} className="px-2 py-1.5 text-right font-medium first:text-left">
                    {h}
                  </th>
                ))}
              </tr>
            ) : (
              <tr>
                {['k', 'R_k', 'φ_k', 'Re', 'Im'].map((h) => (
                  <th key={h} className="px-2 py-1.5 text-right font-medium first:text-left">
                    {h}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody className="text-fg-2">
            {form === 'real'
              ? rows!.map((k) => (
                  <tr key={k} className="border-t border-line/60 hover:bg-bg-3/60">
                    <td className="px-2 py-1 text-left text-fg">{k}</td>
                    <td className="px-2 py-1 text-right">{f(real.a[k])}</td>
                    <td className="px-2 py-1 text-right">{f(real.b[k])}</td>
                    <td className="px-2 py-1 text-right">{f(real.c[k])}</td>
                    <td className="px-2 py-1 text-right">{f(real.d[k])}</td>
                  </tr>
                ))
              : data.harmonics.map((h) => (
                  <tr key={h.k} className="border-t border-line/60 hover:bg-bg-3/60">
                    <td className="px-2 py-1 text-left text-fg">{h.k}</td>
                    <td className="px-2 py-1 text-right">{f(h.radius)}</td>
                    <td className="px-2 py-1 text-right">{f(h.phase)}</td>
                    <td className="px-2 py-1 text-right">{f(h.re)}</td>
                    <td className="px-2 py-1 text-right">{f(h.im)}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
