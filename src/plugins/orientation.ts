import type { Source } from '../core/types'
import { onWindow } from '../core/events'
import { round4 } from '../core/num'
import { noop } from '../core/noop'

/**
 * `--live-orient-alpha`, `--live-orient-beta`, `--live-orient-gamma` (degrees)
 * from `deviceorientation`. Requires a user-gesture permission grant on some
 * platforms (notably iOS). Seeded to zeros (flat) so the properties resolve on
 * frame one, whether or not a grant ever arrives.
 */
export const orientation: Source = {
  key: 'orientation',
  scope: 'global',
  start(ctx) {
    ctx.write('orient-alpha', 0)
    ctx.write('orient-beta', 0)
    ctx.write('orient-gamma', 0)
    if (typeof DeviceOrientationEvent === 'undefined') return noop

    const onOrient = (e: Event) => {
      const ev = e as DeviceOrientationEvent
      ctx.write('orient-alpha', round4(ev.alpha ?? 0))
      ctx.write('orient-beta', round4(ev.beta ?? 0))
      ctx.write('orient-gamma', round4(ev.gamma ?? 0))
    }
    // one shared window `deviceorientation` listener for the page
    return onWindow('deviceorientation', onOrient)
  },
}
