import { useEffect, useMemo, useRef, useState } from 'react'
import { useStudio } from '@/store/useStudio'
import type { SpectrumData } from '@/store/useSpectrum'
import { coefficientsJson, latexDocument } from '@/core/export/formulas'
import { glslSnippet, javascriptSnippet, pythonSnippet } from '@/core/export/code'
import { animatedSvg } from '@/core/export/svgExport'
import { copyText, downloadBlob, downloadText, slug } from '@/core/export/download'
import { canvasRegistry } from '@/components/Canvas/canvasRegistry'
import { PERIOD_SECONDS } from '@/hooks/usePlayback'
import { Button, Segmented } from '@/components/ui/primitives'
import { Check, Copy, Download, Record, X } from '@/components/ui/icons'

type Tab = 'math' | 'code' | 'media'

function CodeBlock({ title, text, filename, mime = 'text/plain' }: { title: string; text: string; filename: string; mime?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-fg">{title}</span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (await copyText(text)) {
                setCopied(true)
                setTimeout(() => setCopied(false), 1200)
              }
            }}
          >
            {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadText(filename, text, mime)}>
            <Download /> {filename}
          </Button>
        </div>
      </div>
      <pre className="max-h-[320px] overflow-auto rounded-lg border border-line bg-bg-3/60 p-3 font-mono text-[11.5px] leading-relaxed text-fg-2">
        {text}
      </pre>
    </div>
  )
}

export function ExportModal({ data }: { data: SpectrumData }) {
  const open = useStudio((s) => s.exportOpen)
  const setOpen = useStudio((s) => s.setExportOpen)
  const sourceName = useStudio((s) => s.sourceName)
  const [tab, setTab] = useState<Tab>('math')
  const [codeLang, setCodeLang] = useState<'python' | 'javascript' | 'glsl'>('python')
  const [mathKind, setMathKind] = useState<'latex' | 'json'>('latex')

  const base = slug(sourceName)
  const latex = useMemo(() => latexDocument(data.spectrum.real, data.harmonics, data.K, data.contour.n, sourceName, data.is3D), [data, sourceName])
  const json = useMemo(() => coefficientsJson(data.spectrum.real, data.harmonics, data.K, data.contour.n, sourceName, data.is3D), [data, sourceName])
  const code = useMemo(() => {
    if (codeLang === 'python') return pythonSnippet(data.harmonics)
    if (codeLang === 'javascript') return javascriptSnippet(data.harmonics)
    return glslSnippet(data.harmonics)
  }, [codeLang, data.harmonics])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Export" className="fade-up flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-bg-2 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-semibold">Export</span>
            <Segmented<Tab>
              size="sm"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'math', label: 'Math' },
                { value: 'code', label: 'Code' },
                { value: 'media', label: 'Media' },
              ]}
            />
          </div>
          <Button size="icon" onClick={() => setOpen(false)} aria-label="Close">
            <X />
          </Button>
        </div>
        <div className="flex flex-col gap-4 overflow-auto p-4">
          {tab === 'math' && (
            <>
              <Segmented
                size="sm"
                value={mathKind}
                onChange={setMathKind}
                options={[
                  { value: 'latex', label: 'LaTeX' },
                  { value: 'json', label: 'JSON coefficients' },
                ]}
              />
              {mathKind === 'latex' ? (
                <CodeBlock title="LaTeX · equations and coefficient table" text={latex} filename={`${base}-fourier.tex`} mime="application/x-tex" />
              ) : (
                <CodeBlock title="JSON · {a_k, b_k, c_k, d_k} and {R_k, φ_k, k}" text={json} filename={`${base}-coefficients.json`} mime="application/json" />
              )}
            </>
          )}
          {tab === 'code' && (
            <>
              <Segmented
                size="sm"
                value={codeLang}
                onChange={setCodeLang}
                options={[
                  { value: 'python', label: 'Python · Matplotlib' },
                  { value: 'javascript', label: 'JavaScript · Canvas' },
                  { value: 'glsl', label: 'GLSL shader' },
                ]}
              />
              <CodeBlock
                title={codeLang === 'python' ? 'Ready-to-run Matplotlib animation' : codeLang === 'javascript' ? 'Standalone HTML5 Canvas page' : 'Fragment shader (ShaderToy-style uniforms)'}
                text={code}
                filename={codeLang === 'python' ? `${base}-epicycles.py` : codeLang === 'javascript' ? `${base}-epicycles.html` : `${base}-epicycles.frag`}
              />
            </>
          )}
          {tab === 'media' && <MediaTab data={data} base={base} />}
        </div>
      </div>
    </div>
  )
}

function MediaTab({ data, base }: { data: SpectrumData; base: string }) {
  const [recording, setRecording] = useState(false)
  const [progress, setProgress] = useState(0)
  const [cycles, setCycles] = useState(1)
  const stopRef = useRef<(() => void) | null>(null)
  const notify = useStudio((s) => s.notify)
  const theme = useStudio((s) => s.theme)
  const palette = useStudio((s) => s.palette)
  const speed = useStudio((s) => s.speed)
  const seconds = (PERIOD_SECONDS / speed) * cycles
  const supported = typeof MediaRecorder !== 'undefined'

  useEffect(() => () => stopRef.current?.(), [])

  const record = () => {
    const canvas = canvasRegistry.get()
    if (!canvas) return notify('No viewport canvas to record')
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m))
    if (!mime) return notify('MediaRecorder is not supported in this browser')
    const stream = canvas.captureStream(60)
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 })
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = () => {
      const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm'
      downloadBlob(`${base}-epicycles.${ext}`, new Blob(chunks, { type: mime }))
      setRecording(false)
      setProgress(0)
      notify(`Saved ${ext.toUpperCase()} · ${seconds.toFixed(1)}s`)
    }
    const s = useStudio.getState()
    s.setT(0)
    s.setPlaying(true)
    s.setExportOpen(false)
    rec.start(250)
    setRecording(true)
    const start = performance.now()
    let raf = 0
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / (seconds * 1000))
      setProgress(p)
      if (p >= 1) {
        rec.stop()
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    stopRef.current = () => {
      cancelAnimationFrame(raf)
      if (rec.state !== 'inactive') rec.stop()
      stream.getTracks().forEach((t) => t.stop())
    }
  }

  const snapshot = () => {
    const canvas = canvasRegistry.get()
    if (!canvas) return
    const out = document.createElement('canvas')
    out.width = canvas.width
    out.height = canvas.height
    const ctx = out.getContext('2d')!
    ctx.fillStyle = theme === 'dark' ? '#0b0d12' : '#f6f7f9'
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.drawImage(canvas, 0, 0)
    out.toBlob((b) => b && downloadBlob(`${base}-frame.png`, b), 'image/png')
  }

  const svg = () =>
    downloadText(
      `${base}-animated.svg`,
      animatedSvg(data.harmonics, data.approx, {
        colors: { bg: theme === 'dark' ? '#0b0d12' : '#f6f7f9', circle: palette.circles, arm: palette.arms, trail: palette.trail },
      }),
      'image/svg+xml',
    )

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
        <div className="text-[12.5px] font-medium">Video recording</div>
        <p className="text-[11.5px] leading-relaxed text-fg-3">Records the live viewport with MediaRecorder from t = 0 for whole cycles at the current speed.</p>
        <label className="flex items-center justify-between text-[12px] text-fg-2">
          Cycles
          <select value={cycles} onChange={(e) => setCycles(Number(e.target.value))} className="h-7 rounded-md border border-line bg-bg-3 px-2 font-mono text-[12px] text-fg outline-none">
            {[1, 2, 3].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <div className="font-mono text-[11px] text-fg-3">≈ {seconds.toFixed(1)} s</div>
        {recording ? (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full bg-accent transition-[width]" style={{ width: `${progress * 100}%` }} />
          </div>
        ) : (
          <Button variant="accent" onClick={record} disabled={!supported}>
            <Record /> Record WebM
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
        <div className="text-[12.5px] font-medium">Animated SVG</div>
        <p className="text-[11.5px] leading-relaxed text-fg-3">Loopable vector animation: nested rotating groups for each epicycle plus a drawn-on path. Works in any browser.</p>
        <Button variant="solid" onClick={svg}>
          <Download /> Download SVG
        </Button>
      </div>
      <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
        <div className="text-[12.5px] font-medium">PNG frame</div>
        <p className="text-[11.5px] leading-relaxed text-fg-3">High-DPI snapshot of the current viewport frame.</p>
        <Button variant="solid" onClick={snapshot}>
          <Download /> Save PNG
        </Button>
      </div>
    </div>
  )
}
