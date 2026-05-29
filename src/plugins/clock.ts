import type { Source } from '../core/types'

/**
 * `--live-now` (epoch seconds), `--live-hours`, `--live-minutes`, `--live-seconds`.
 * Updates once per second — enables CSS clocks.
 */
export const clock: Source = {
  key: 'clock',
  scope: 'global',
  start(ctx) {
    const update = () => {
      const d = new Date()
      ctx.write('now', Math.floor(d.getTime() / 1000))
      ctx.write('hours', d.getHours())
      ctx.write('minutes', d.getMinutes())
      ctx.write('seconds', d.getSeconds())
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  },
}
