import type { Source } from '../core/types'
import { onWindow } from '../core/window-events'
import { round4 } from '../core/num'

/**
 * `--live-orient-alpha`, `--live-orient-beta`, `--live-orient-gamma` (degrees)
 * from `deviceorientation`. Requires a user-gesture permission grant on some
 * platforms (notably iOS).
 */
export const orientation: Source = {
  key: 'orientation',
  scope: 'global',
  start(ctx) {
    if (typeof DeviceOrientationEvent === 'undefined') return () => {}

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
