import type { Source } from '../../core/types'
import { observeResize } from '../../core/observers'
import { round4 } from '../../core/num'

/** `--live-w`, `--live-h`, `--live-aspect` (w/h) */
export const size: Source = {
  key: 'size',
  scope: 'element',
  start(ctx) {
    return observeResize(ctx.target, (entry) => {
      const box = entry.borderBoxSize?.[0]
      const w = box ? box.inlineSize : entry.contentRect.width
      const h = box ? box.blockSize : entry.contentRect.height
      ctx.write('w', round4(w))
      ctx.write('h', round4(h))
      ctx.write('aspect', h > 0 ? round4(w / h) : 0)
    })
  },
}
