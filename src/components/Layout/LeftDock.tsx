import { useState } from 'react'
import type { SpectrumData } from '@/store/useSpectrum'
import { Segmented } from '@/components/ui/primitives'
import { SpectrumChart } from '@/components/Export/SpectrumChart'
import { FormulaViewer } from '@/components/Export/FormulaViewer'
import { CoefficientTable } from '@/components/Export/CoefficientTable'
import { ParameterPanel } from '@/components/Controls/ParameterPanel'

type Tab = 'harmonics' | 'settings'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 px-4 py-4">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-3">{title}</h3>
      {children}
    </section>
  )
}

/** Harmonic Stack: spectrum, formulas and coefficients, plus a settings tab. */
export function LeftDock({ data }: { data: SpectrumData }) {
  const [tab, setTab] = useState<Tab>('harmonics')
  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-r border-line bg-bg-2">
      <div className="border-b border-line px-4 py-2.5">
        <Segmented<Tab>
          size="sm"
          className="w-full [&>button]:flex-1 [&>button]:justify-center"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'harmonics', label: 'Harmonic stack' },
            { value: 'settings', label: 'Parameters' },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'harmonics' ? (
          <div className="divide-y divide-line">
            <Section title={`Spectrum · |c_k| · drag to set K`}>
              <SpectrumChart data={data} />
            </Section>
            <Section title="Formulas">
              <FormulaViewer data={data} />
            </Section>
            <Section title="Coefficients">
              <CoefficientTable data={data} />
            </Section>
          </div>
        ) : (
          <ParameterPanel />
        )}
      </div>
    </aside>
  )
}
