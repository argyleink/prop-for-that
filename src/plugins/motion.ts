import type { Source } from '../core/types'

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
      ctx.write('accel-x', Math.round((a?.x ?? 0) * 1e4) / 1e4)
      ctx.write('accel-y', Math.round((a?.y ?? 0) * 1e4) / 1e4)
      ctx.write('accel-z', Math.round((a?.z ?? 0) * 1e4) / 1e4)
    }
    window.addEventListener('devicemotion', onMotion, { passive: true })
    return () => window.removeEventListener('devicemotion', onMotion)
  },
}
