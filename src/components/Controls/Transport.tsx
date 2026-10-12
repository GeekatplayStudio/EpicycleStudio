import { useStudio } from '@/store/useStudio'
import { Button, Label } from '@/components/ui/primitives'
import { Pause, Play } from '@/components/ui/icons'
import { HarmonicSlider } from './HarmonicSlider'
import type { SpectrumData } from '@/store/useSpectrum'

const SPEEDS = [0.1, 0.25, 0.5, 1, 2, 5]

export function Transport({ data }: { data: SpectrumData }) {
  const playing = useStudio((s) => s.playing)
  const togglePlaying = useStudio((s) => s.togglePlaying)
  const t = useStudio((s) => s.t)
  const setT = useStudio((s) => s.setT)
  const speed = useStudio((s) => s.speed)
  const setSpeed = useStudio((s) => s.setSpeed)
  const frac = t / (2 * Math.PI)

  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-line bg-bg-2 px-4 py-3">
      <Button variant="solid" size="icon" onClick={togglePlaying} title={playing ? 'Pause (space)' : 'Play (space)'} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <Pause /> : <Play />}
      </Button>

      <div className="flex min-w-[240px] flex-[2] flex-col gap-1">
        <Label hint={<span>t = {t.toFixed(3)} rad · {(frac * 100).toFixed(1)}%</span>}>Timeline</Label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.0005}
          value={frac}
          onChange={(e) => setT(Number(e.target.value) * 2 * Math.PI)}
          aria-label="Scrub timeline"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label hint={`${speed}×`}>Speed</Label>
        <div className="flex items-center gap-0.5 rounded-lg border border-line bg-bg-3 p-0.5">
          {SPEEDS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setSpeed(v)}
              className={`h-6 min-w-8 rounded-md px-1.5 font-mono text-[11px] tabular-nums transition-colors ${
                v === speed ? 'bg-bg-2 text-fg shadow-sm' : 'text-fg-3 hover:text-fg-2'
              }`}
            >
              {v}×
            </button>
          ))}
        </div>
      </div>

      <HarmonicSlider kMax={data.kMax} error={data.error} />
    </div>
  )
}
