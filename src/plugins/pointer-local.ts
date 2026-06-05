import type { Source } from '../core/types'
import { onWindow } from '../core/window-events'
import { round4 } from '../core/num'

/**
 * `--live-local-pointer-x-ratio`, `--live-local-pointer-y-ratio` (0–1 within the
 * element's box), `--live-local-pointer-inside` (0/1).
 *
 * Shares the page's single `pointermove` listener. The rect is read per move
 * (cheap when layout is clean) so it stays correct through layout shifts, which
 * a cached rect would miss.
 */
export const pointerLocal: Source = {
  key: 'pointer-local',
  scope: 'element',
  start(ctx) {
    const el = ctx.target
    const onMove = (e: Event) => {
      const p = e as PointerEvent
      const r = el.getBoundingClientRect()
      const px = r.width > 0 ? (p.clientX - r.left) / r.width : 0
      const py = r.height > 0 ? (p.clientY - r.top) / r.height : 0
      const inside = px >= 0 && px <= 1 && py >= 0 && py <= 1
      ctx.write('local-pointer-x-ratio', round4(px))
      ctx.write('local-pointer-y-ratio', round4(py))
      ctx.write('local-pointer-inside', inside ? 1 : 0)
    }
    return onWindow('pointermove', onMove)
  },
}
