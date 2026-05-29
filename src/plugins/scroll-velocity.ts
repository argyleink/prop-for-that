import type { Source } from '../core/types'

/**
 * `--live-scroll-velocity` (signed px/frame, decays toward 0 when idle),
 * `--live-scroll-direction` (1 down / -1 up / 0).
 */
export const scrollVelocity: Source = {
  key: 'scroll-velocity',
  scope: 'global',
  start(ctx) {
    let lastY = window.scrollY
    let velocity = 0
    let frame = 0

    const loop = () => {
      const y = window.scrollY
      const delta = y - lastY
      lastY = y
      // Decay toward the latest delta so idle frames ease back to 0.
      velocity = delta || velocity * 0.8
      if (Math.abs(velocity) < 0.01) velocity = 0
      const v = Math.round(velocity * 1e4) / 1e4
      ctx.write('scroll-velocity', v)
      ctx.write('scroll-direction', v > 0 ? 1 : v < 0 ? -1 : 0)
      frame = requestAnimationFrame(loop)
    }

    ctx.write('scroll-velocity', 0)
    ctx.write('scroll-direction', 0)
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  },
}
