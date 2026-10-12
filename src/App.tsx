import { useEffect, useState } from 'react'
import { useStudio } from '@/store/useStudio'
import { useSpectrum } from '@/store/useSpectrum'
import { usePlaybackClock, useShortcuts } from '@/hooks/usePlayback'
import { TopBar } from '@/components/Layout/TopBar'
import { LeftDock } from '@/components/Layout/LeftDock'
import { Viewport } from '@/components/Canvas/Viewport'
import { Transport } from '@/components/Controls/Transport'
import { ExportModal } from '@/components/Export/MediaExporter'

function Toast() {
  const toast = useStudio((s) => s.toast)
  const notify = useStudio((s) => s.notify)
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => notify(null), 3200)
    return () => clearTimeout(id)
  }, [toast, notify])
  if (!toast) return null
  return (
    <div className="fade-up pointer-events-none fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full border border-line bg-bg-2/90 px-4 py-2 text-[12.5px] text-fg shadow-lg backdrop-blur">
      {toast}
    </div>
  )
}

export default function App() {
  usePlaybackClock()
  useShortcuts()
  const data = useSpectrum()
  const [dockOpen, setDockOpen] = useState(true)

  return (
    <div className="flex h-full flex-col bg-bg text-fg">
      <TopBar dockOpen={dockOpen} onToggleDock={() => setDockOpen((v) => !v)} />
      <div className="flex min-h-0 flex-1">
        {dockOpen && <LeftDock data={data} />}
        <main className="flex min-w-0 flex-1 flex-col">
          <Viewport data={data} />
          <Transport data={data} />
        </main>
      </div>
      <ExportModal data={data} />
      <Toast />
    </div>
  )
}
