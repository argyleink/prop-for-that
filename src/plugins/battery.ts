import type { Disposer, Source } from '../core/types'
import { round4 } from '../core/num'
import { noop } from '../core/noop'
import { onAll } from '../core/events'

interface BatteryManager extends EventTarget {
  level: number
  charging: boolean
}

/** `--live-battery-level` (0–1), `--live-battery-charging` (0/1) */
export const battery: Source = {
  key: 'battery',
  scope: 'global',
  start(ctx) {
    const getBattery = (navigator as { getBattery?: () => Promise<BatteryManager> })
      .getBattery
    if (!getBattery) return noop

    let disposed = false
    let off: Disposer = noop

    getBattery
      .call(navigator)
      .then((battery) => {
        if (disposed) return
        const update = () => {
          ctx.write('battery-level', round4(battery.level))
          ctx.write('battery-charging', battery.charging ? 1 : 0)
        }
        update()
        off = onAll(battery, ['levelchange', 'chargingchange'], update)
      })
      // present but rejecting: insecure context, or the API disabled by policy.
      // Swallow it — an unhandled rejection isn't the page author's to debug.
      .catch(() => {})

    return () => {
      disposed = true
      off()
    }
  },
}
