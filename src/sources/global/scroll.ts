import type { Source } from '../../core/types'
import { onWindow } from '../../core/window-events'

/** `--live-scroll-x`, `--live-scroll-y`, `--live-scroll-progress` (0–1) */
export const scroll: Source = {
  key: 'scroll',
  scope: 'global',
  start(ctx) {
    const update = () => {
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      ctx.write('scroll-x', window.scrollX)
      ctx.write('scroll-y', y)
      ctx.write('scroll-progress', max > 0 ? Math.round((y / max) * 1e4) / 1e4 : 0)
    }
    update()
    const offScroll = onWindow('scroll', update)
    const offResize = onWindow('resize', update)
    return () => {
      offScroll()
      offResize()
    }
  },
}
