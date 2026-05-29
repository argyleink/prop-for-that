import type { Source } from '../core/types'

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
      ctx.write('vvp-scale', Math.round(vvp.scale * 1e4) / 1e4)
      ctx.write('vvp-offset-top', vvp.offsetTop)
      ctx.write('vvp-height', vvp.height)
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
