import type { Source } from '../../core/types'
import { observeResize } from '../../core/observers'

/** `--live-w`, `--live-h`, `--live-aspect` (w/h) */
export const size: Source = {
  key: 'size',
  scope: 'element',
  start(ctx) {
    return observeResize(ctx.target, (entry) => {
      const box = entry.borderBoxSize?.[0]
      const w = box ? box.inlineSize : entry.contentRect.width
      const h = box ? box.blockSize : entry.contentRect.height
      ctx.write('w', w)
      ctx.write('h', h)
      ctx.write('aspect', h > 0 ? Math.round((w / h) * 1e4) / 1e4 : 0)
    })
  },
}
