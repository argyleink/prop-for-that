import type { Source } from '../core/types'
import { round4 } from '../core/num'

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
    if (!getBattery) return () => {}

    let disposed = false
    let mgr: BatteryManager | undefined
    let update: (() => void) | undefined

    getBattery.call(navigator).then((battery) => {
      if (disposed) return
      mgr = battery
      update = () => {
        ctx.write('battery-level', round4(battery.level))
        ctx.write('battery-charging', battery.charging ? 1 : 0)
      }
      update()
      battery.addEventListener('levelchange', update)
      battery.addEventListener('chargingchange', update)
    })

    return () => {
      disposed = true
      if (mgr && update) {
        mgr.removeEventListener('levelchange', update)
        mgr.removeEventListener('chargingchange', update)
      }
    }
  },
}
