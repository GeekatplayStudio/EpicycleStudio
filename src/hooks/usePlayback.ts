import { useEffect } from 'react'
import { useStudio } from '@/store/useStudio'

/** Seconds for one full revolution of t at speed 1. */
export const PERIOD_SECONDS = 10

/** Global clock: advances t while playing. Mounted once in App. */
export function usePlaybackClock() {
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const s = useStudio.getState()
      if (s.playing && s.tool !== 'draw') s.setT(s.t + (dt * s.speed * 2 * Math.PI) / PERIOD_SECONDS)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
}

/** Keyboard shortcuts. */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return
      const s = useStudio.getState()
      if (e.key === ' ') {
        e.preventDefault()
        s.togglePlaying()
      } else if (e.key === 'd' || e.key === 'D') {
        s.setTool(s.tool === 'draw' ? 'view' : 'draw')
      } else if (e.key === 'm' || e.key === 'M') {
        s.setMode(s.mode === 'split' ? 'complex' : 'split')
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        s.setK(s.k + (e.shiftKey ? 10 : 1))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        s.setK(s.k - (e.shiftKey ? 10 : 1))
      } else if (e.key === 'ArrowLeft') {
        s.setT(s.t - 0.02)
      } else if (e.key === 'ArrowRight') {
        s.setT(s.t + 0.02)
      } else if (e.key === 'e' || e.key === 'E') {
        s.setExportOpen(!s.exportOpen)
      } else if (e.key === 'Escape') {
        if (s.exportOpen) s.setExportOpen(false)
        else if (s.tool === 'draw') s.setTool('view')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
