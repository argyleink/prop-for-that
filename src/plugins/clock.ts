import type { Source } from '../core/types'

/**
 * `--live-now` (epoch seconds), `--live-hours`, `--live-minutes`, `--live-seconds`.
 * Re-armed to each whole second so it doesn't drift.
 */
export const clock: Source = {
  key: 'clock',
  scope: 'global',
  start(ctx) {
    let timer = 0

    const update = () => {
      const d = new Date()
      ctx.write('now', Math.floor(d.getTime() / 1000))
      ctx.write('hours', d.getHours())
      ctx.write('minutes', d.getMinutes())
      ctx.write('seconds', d.getSeconds())
      timer = setTimeout(update, 1000 - (Date.now() % 1000)) as unknown as number
    }
    update()
    return () => clearTimeout(timer)
  },
}
