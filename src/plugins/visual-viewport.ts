import type { Source } from '../core/types'
import { round4 } from '../core/num'

/**
 * `--live-vvp-scale`, `--live-vvp-offset-top`, `--live-vvp-height`
 * from `window.visualViewport`.
 */
export const visualViewport: Source = {
  key: 'visual-viewport',
  scope: 'global',
  start(ctx) {
    const vvp = window.visualViewport
    if (!vvp) return () => {}

    const update = () => {
      ctx.write('vvp-scale', round4(vvp.scale))
      ctx.write('vvp-offset-top', round4(vvp.offsetTop))
      ctx.write('vvp-height', round4(vvp.height))
    }
    update()
    vvp.addEventListener('resize', update, { passive: true })
    vvp.addEventListener('scroll', update, { passive: true })
    return () => {
      vvp.removeEventListener('resize', update)
      vvp.removeEventListener('scroll', update)
    }
  },
}
