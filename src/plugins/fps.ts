import type { Source } from '../core/types'
import { onFrame } from '../core/frame'

/**
 * `--live-fps`, a short exponential moving average of recent frame rates so the
 * value is stable rather than jittering frame to frame. Runs on the shared frame
 * loop while bound.
 */
export const fps: Source = {
  key: 'fps',
  scope: 'global',
  start(ctx) {
    let last = performance.now()
    let avg = 60

    return onFrame((now) => {
      const dt = now - last
      last = now
      if (dt <= 0) return
      avg += (1000 / dt - avg) * 0.1
      ctx.write('fps', Math.round(avg))
    })
  },
}
