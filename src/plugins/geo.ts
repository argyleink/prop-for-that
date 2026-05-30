import type { Source } from '../core/types'
import { round4 } from '../core/num'

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
      ctx.write('geo-lat', round4(pos.coords.latitude))
      ctx.write('geo-lng', round4(pos.coords.longitude))
      ctx.write('geo-accuracy', round4(pos.coords.accuracy))
    })

    return () => {
      disposed = true
      geolocation.clearWatch(id)
    }
  },
}
