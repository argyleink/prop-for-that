import type { Source } from '../core/types'
import { round4 } from '../core/num'

/**
 * `--live-accel-x`, `--live-accel-y`, `--live-accel-z` (m/s², gravity included)
 * from `devicemotion`. Requires a user-gesture permission grant on some
 * platforms (notably iOS).
 */
export const motion: Source = {
  key: 'motion',
  scope: 'global',
  start(ctx) {
    if (typeof DeviceMotionEvent === 'undefined') return () => {}

    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity
      ctx.write('accel-x', round4(a?.x ?? 0))
      ctx.write('accel-y', round4(a?.y ?? 0))
      ctx.write('accel-z', round4(a?.z ?? 0))
    }
    window.addEventListener('devicemotion', onMotion, { passive: true })
    return () => window.removeEventListener('devicemotion', onMotion)
  },
}
