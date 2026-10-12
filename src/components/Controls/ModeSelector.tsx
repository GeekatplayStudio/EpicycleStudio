import { useStudio } from '@/store/useStudio'
import { Segmented } from '@/components/ui/primitives'
import type { RenderMode } from '@/core/types/epicycle'

export function ModeSelector({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const mode = useStudio((s) => s.mode)
  const setMode = useStudio((s) => s.setMode)
  return (
    <Segmented<RenderMode>
      size={size}
      value={mode}
      onChange={setMode}
      options={[
        { value: 'split', label: 'Orthogonal split', title: 'Two real series: x(t) and y(t) chains with projection lines' },
        { value: 'complex', label: 'Complex chain', title: 'Single tip-to-tail chain of c_k·e^{ikt}' },
      ]}
    />
  )
}
