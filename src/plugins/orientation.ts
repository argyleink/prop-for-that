import type { Source } from '../core/types'
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

    const onOrient = (e: DeviceOrientationEvent) => {
      ctx.write('orient-alpha', round4(e.alpha ?? 0))
      ctx.write('orient-beta', round4(e.beta ?? 0))
      ctx.write('orient-gamma', round4(e.gamma ?? 0))
    }
    window.addEventListener('deviceorientation', onOrient, { passive: true })
    return () => window.removeEventListener('deviceorientation', onOrient)
  },
}
