import type { Source } from '../core/types'
import { onWindow } from '../core/events'
import { round4 } from '../core/num'

/**
 * `--live-local-pointer-x-ratio`, `--live-local-pointer-y-ratio` (0–1 within the
 * element's box), `--live-local-pointer-inside` (0/1).
 *
 * Shares the page's single `pointermove` listener, but reads the element's rect
 * on **every move** so it stays correct through layout shifts, which a cached
 * rect would miss. That's one `getBoundingClientRect` per bound element per
 * move — cheap when layout is clean, but bind it to the few elements that need
 * it rather than to every card in a grid.
 *
 * Seeded to zeros so all three properties resolve on frame one. Until the first
 * move the ratios are meaningless, so gate on `--live-local-pointer-inside`
 * (`0` until the pointer is actually over the element) rather than assuming the
 * pointer starts in the top-left corner.
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
    ctx.write('local-pointer-x-ratio', 0)
    ctx.write('local-pointer-y-ratio', 0)
    ctx.write('local-pointer-inside', 0)
    return onWindow('pointermove', onMove)
  },
}
