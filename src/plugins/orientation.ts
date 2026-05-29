import type { Source } from '../core/types'

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
      ctx.write('orient-alpha', Math.round((e.alpha ?? 0) * 1e4) / 1e4)
      ctx.write('orient-beta', Math.round((e.beta ?? 0) * 1e4) / 1e4)
      ctx.write('orient-gamma', Math.round((e.gamma ?? 0) * 1e4) / 1e4)
    }
    window.addEventListener('deviceorientation', onOrient, { passive: true })
    return () => window.removeEventListener('deviceorientation', onOrient)
  },
}
