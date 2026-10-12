/** Lets the exporter find the live viewport canvas (2D or WebGL). */
let current: HTMLCanvasElement | null = null
export const canvasRegistry = {
  set(c: HTMLCanvasElement | null) {
    current = c
  },
  get() {
    return current
  },
}
