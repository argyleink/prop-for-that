import type { Source } from '../core/types'
import { onWindow } from '../core/events'
import { round4 } from '../core/num'
import { noop } from '../core/noop'

/**
 * `--live-accel-x`, `--live-accel-y`, `--live-accel-z` (m/s², gravity included)
 * from `devicemotion`. Requires a user-gesture permission grant on some
 * platforms (notably iOS). Seeded to zeros (at rest) so the properties resolve
 * on frame one, whether or not a grant ever arrives.
 */
export const motion: Source = {
  key: 'motion',
  scope: 'global',
  start(ctx) {
    ctx.write('accel-x', 0)
    ctx.write('accel-y', 0)
    ctx.write('accel-z', 0)
    if (typeof DeviceMotionEvent === 'undefined') return noop

    const onMotion = (e: Event) => {
      const a = (e as DeviceMotionEvent).accelerationIncludingGravity
      ctx.write('accel-x', round4(a?.x ?? 0))
      ctx.write('accel-y', round4(a?.y ?? 0))
      ctx.write('accel-z', round4(a?.z ?? 0))
    }
    // one shared window `devicemotion` listener for the page
    return onWindow('devicemotion', onMotion)
  },
}
