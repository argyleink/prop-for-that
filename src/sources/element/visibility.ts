import type { Source } from '../../core/types'
import { observeIntersection } from '../../core/observers'

/** `--live-visible` (0/1), `--live-visible-ratio` (0–1) */
export const visibility: Source = {
  key: 'visibility',
  scope: 'element',
  start(ctx) {
    return observeIntersection(ctx.target, (entry) => {
      ctx.write('visible', entry.isIntersecting ? 1 : 0)
      ctx.write('visible-ratio', Math.round(entry.intersectionRatio * 1e4) / 1e4)
    })
  },
}
