import type { Point, RenderMode } from '@/core/types/epicycle'

/** World-space bounding box of everything that must stay visible. */
export interface SceneBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export const CHAIN_GAP = 0.3

/** Anchors of the two real chains (DC offsets live at the anchors). */
export function splitAnchors(a0: number, c0: number, sumRx: number, sumRy: number): { xAnchor: Point; yAnchor: Point } {
  return {
    xAnchor: { x: a0 / 2, y: -(1 + CHAIN_GAP + sumRx) },
    yAnchor: { x: -(1 + CHAIN_GAP + sumRy), y: c0 / 2 },
  }
}

/** Anchor x of the depth chain (right of the drawing), used by the 3D view. */
export function zAnchorX(sumRz: number): number {
  return 1 + CHAIN_GAP + sumRz
}

export function sceneBox(mode: RenderMode, sumRx: number, sumRy: number, sumRc: number, sumRz = 0): SceneBox {
  const zRight = sumRz > 0 ? zAnchorX(sumRz) + sumRz : -Infinity
  if (mode === 'split') {
    const xa = -(1 + CHAIN_GAP + sumRx)
    const ya = -(1 + CHAIN_GAP + sumRy)
    return {
      minX: Math.min(ya - sumRy, -1.05),
      maxX: Math.max(1.05, sumRx * 0.6, zRight),
      minY: Math.min(xa - sumRx, -1.05),
      maxY: Math.max(1.05, sumRy * 0.6),
    }
  }
  const e = Math.max(1.15, Math.min(sumRc * 0.85, 1.8))
  return { minX: -e, maxX: Math.max(e, zRight), minY: -e, maxY: e }
}

export interface ViewTransform {
  scale: number
  ox: number
  oy: number
}

export function fitBox(box: SceneBox, width: number, height: number, padding = 36): ViewTransform {
  const bw = box.maxX - box.minX
  const bh = box.maxY - box.minY
  const scale = Math.min((width - padding * 2) / bw, (height - padding * 2) / bh)
  const ox = width / 2 - ((box.minX + box.maxX) / 2) * scale
  const oy = height / 2 - ((box.minY + box.maxY) / 2) * scale
  return { scale, ox, oy }
}
