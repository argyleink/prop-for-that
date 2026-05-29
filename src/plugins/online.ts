import type { Source } from '../core/types'
import { onWindow } from '../core/window-events'

/** `--live-online` (0/1) */
export const online: Source = {
  key: 'online',
  scope: 'global',
  start(ctx) {
    const update = () => ctx.write('online', navigator.onLine ? 1 : 0)
    update()
    const offOnline = onWindow('online', update)
    const offOffline = onWindow('offline', update)
    return () => {
      offOnline()
      offOffline()
    }
  },
}
