import type { Source } from '../core/types'

/**
 * `--live-scroll-top`, `--live-scroll-left`,
 * `--live-scroll-progress-y` (0–1), `--live-scroll-progress-x` (0–1).
 */
export const elScroll: Source = {
  key: 'el-scroll',
  scope: 'element',
  start(ctx) {
    const el = ctx.target
    const update = () => {
      const maxY = el.scrollHeight - el.clientHeight
      const maxX = el.scrollWidth - el.clientWidth
      ctx.write('scroll-top', el.scrollTop)
      ctx.write('scroll-left', el.scrollLeft)
      ctx.write('scroll-progress-y', maxY > 0 ? Math.round((el.scrollTop / maxY) * 1e4) / 1e4 : 0)
      ctx.write('scroll-progress-x', maxX > 0 ? Math.round((el.scrollLeft / maxX) * 1e4) / 1e4 : 0)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    return () => el.removeEventListener('scroll', update)
  },
}
