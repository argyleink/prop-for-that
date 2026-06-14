import type { Source } from '../core/types'
import { onFrame } from '../core/frame'

/**
 * `--live-fps`, a short exponential moving average of recent frame rates so the
 * value is stable rather than jittering frame to frame. Runs on the shared frame
 * loop while bound.
 *
 * The EMA is sampled every frame, but `--live-fps` is **written at most every
 * `WRITE_MS`** — not every frame. Writing per-frame couples the readout to the
 * frame rate: each write invalidates `--live-fps` for the whole tree, and on a
 * large reactive DOM that restyle is heavy enough to lower the frame rate, which
 * changes the rounded value, which writes again — a feedback loop that spirals
 * FPS downward and floods Firefox with restyle work until the tab hangs. A
 * throttled write breaks the loop and an fps readout doesn't need >4 Hz anyway.
 */
const WRITE_MS = 250

export const fps: Source = {
  key: 'fps',
  scope: 'global',
  start(ctx) {
    let last = performance.now()
    let lastWrite = last
    let avg = 60
    ctx.write('fps', Math.round(avg)) // seed so --live-fps exists on frame one

    return onFrame((now) => {
      const dt = now - last
      last = now
      if (dt <= 0) return
      avg += (1000 / dt - avg) * 0.1
      if (now - lastWrite < WRITE_MS) return
      lastWrite = now
      ctx.write('fps', Math.round(avg))
    })
  },
}
