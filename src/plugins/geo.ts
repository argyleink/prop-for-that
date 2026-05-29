import type { Source } from '../core/types'

/**
 * `--live-geo-lat`, `--live-geo-lng`, `--live-geo-accuracy` (meters) from
 * `navigator.geolocation.watchPosition`. Requires a user-gesture permission
 * grant on some platforms.
 */
export const geo: Source = {
  key: 'geo',
  scope: 'global',
  start(ctx) {
    const geolocation = navigator.geolocation
    if (!geolocation) return () => {}

    let disposed = false
    const id = geolocation.watchPosition((pos) => {
      if (disposed) return
      ctx.write('geo-lat', Math.round(pos.coords.latitude * 1e4) / 1e4)
      ctx.write('geo-lng', Math.round(pos.coords.longitude * 1e4) / 1e4)
      ctx.write('geo-accuracy', Math.round(pos.coords.accuracy * 1e4) / 1e4)
    })

    return () => {
      disposed = true
      geolocation.clearWatch(id)
    }
  },
}
