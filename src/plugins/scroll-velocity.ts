import type { Source } from '../core/types'
import { onFrame } from '../core/frame'
import { onWindow } from '../core/events'
import { round4 } from '../core/num'

/**
 * `--live-scroll-velocity` (signed px/frame, decays toward 0 when idle),
 * `--live-scroll-direction` (1 down / -1 up / 0).
 *
 * Idles when the page isn't scrolling: a scroll event wakes a per-frame sampler
 * that decays the velocity and then stops itself once it reaches 0.
 */
export const scrollVelocity: Source = {
  key: 'scroll-velocity',
  scope: 'global',
  start(ctx) {
    let lastY = window.scrollY
    // Captured in the scroll handler, never inside the frame. Reading scrollY
    // from a sampler forces a style+layout recalc every frame (the previous
    // frame's writes left style dirty); reading it in the event, post-layout, is
    // free — the same read/write split the whole library is built on. Idle-frame
    // decay is unaffected: no scroll event means `latestY` holds, so delta is 0.
    let latestY = lastY
    let velocity = 0
    let stop: (() => void) | null = null

    const sample = () => {
      const delta = latestY - lastY
      lastY = latestY
      velocity = delta || velocity * 0.8 // ease back to 0 on idle frames
      if (Math.abs(velocity) < 0.01) velocity = 0
      const v = round4(velocity)
      ctx.write('scroll-velocity', v)
      ctx.write('scroll-direction', Math.sign(v))
      if (v === 0 && stop) {
        stop()
        stop = null
      }
    }
    const wake = () => {
      latestY = window.scrollY
      if (!stop) stop = onFrame(sample)
    }

    ctx.write('scroll-velocity', 0)
    ctx.write('scroll-direction', 0)
    const offScroll = onWindow('scroll', wake)
    return () => {
      offScroll()
      stop?.()
    }
  },
}
