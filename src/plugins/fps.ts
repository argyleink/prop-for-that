import type { Source } from '../core/types'

/** `--live-fps` (rounded), measured from frame time in a rAF loop. */
export const fps: Source = {
  key: 'fps',
  scope: 'global',
  start(ctx) {
    let frame = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = now - last
      last = now
      if (dt > 0) ctx.write('fps', Math.round(1000 / dt))
      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  },
}
