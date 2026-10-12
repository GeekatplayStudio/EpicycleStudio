import { useMemo, useState } from 'react'
import katex from 'katex'
import type { SpectrumData } from '@/store/useSpectrum'
import { GENERAL_FORMS, complexSeriesLatex, realSeriesLatex } from '@/core/export/formulas'
import { Segmented } from '@/components/ui/primitives'

function Tex({ tex, display = true }: { tex: string; display?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'html', strict: false }),
    [tex, display],
  )
  return <div className="text-fg" dangerouslySetInnerHTML={{ __html: html }} />
}

/** KaTeX rendering of the general and numeric truncated series. */
export function FormulaViewer({ data }: { data: SpectrumData }) {
  const [form, setForm] = useState<'real' | 'complex'>('real')
  const real = useMemo(() => realSeriesLatex(data.spectrum.real, data.K, 4, 3), [data.spectrum, data.K])
  const complex = useMemo(() => complexSeriesLatex(data.harmonics, 5, 3), [data.harmonics])

  return (
    <div className="flex flex-col gap-3">
      <Segmented
        size="sm"
        value={form}
        onChange={setForm}
        options={[
          { value: 'real', label: 'Dual real series' },
          { value: 'complex', label: 'Complex form' },
        ]}
      />
      <div className="rounded-lg border border-line bg-bg-3/60 px-3 py-2">
        {form === 'real' ? (
          <>
            <Tex tex={GENERAL_FORMS.x} />
            <Tex tex={GENERAL_FORMS.y} />
          </>
        ) : (
          <Tex tex={GENERAL_FORMS.z} />
        )}
      </div>
      <div className="text-[11px] uppercase tracking-[0.08em] text-fg-3">Numeric · K = {data.K}</div>
      <div className="rounded-lg border border-line bg-bg-3/60 px-3 py-2 text-[13px]">
        {form === 'real' ? (
          <>
            <Tex tex={real.x} />
            <Tex tex={real.y} />
          </>
        ) : (
          <Tex tex={complex} />
        )}
      </div>
    </div>
  )
}
