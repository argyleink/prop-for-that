import type { Source } from '../../core/types'
import { onWindow } from '../../core/window-events'

/** `--live-vw`, `--live-vh` */
export const viewport: Source = {
  key: 'viewport',
  scope: 'global',
  start(ctx) {
    const update = () => {
      ctx.write('vw', window.innerWidth)
      ctx.write('vh', window.innerHeight)
    }
    update()
    return onWindow('resize', update)
  },
}
