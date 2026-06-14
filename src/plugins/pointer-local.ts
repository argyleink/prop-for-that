import type { Source } from '../core/types'
import { onWindow } from '../core/window-events'
import { observeResize } from '../core/observers'
import { round4 } from '../core/num'

/**
 * `--live-local-pointer-x-ratio`, `--live-local-pointer-y-ratio` (0–1 within the
 * element's box), `--live-local-pointer-inside` (0/1).
 *
 * Shares the page's single `pointermove` listener. The element's bounding rect
 * is cached and refreshed on scroll, resize, and element-resize events rather
 * than re-read on every pointer event. Re-reading the rect on every move forces
 * a style flush in Firefox when inherited custom properties were written since
 * the last frame, causing the renderer to re-resolve the full cascade for the
 * entire document on every pointer event — which compounds at trackpad rates
 * and can crash the tab.
 */
export const pointerLocal: Source = {
  key: 'pointer-local',
  scope: 'element',
  start(ctx) {
    const el = ctx.target
    let rect = el.getBoundingClientRect()
    const updateRect = () => {
      rect = el.getBoundingClientRect()
    }

    const onMove = (e: Event) => {
      const p = e as PointerEvent
      const px = rect.width > 0 ? (p.clientX - rect.left) / rect.width : 0
      const py = rect.height > 0 ? (p.clientY - rect.top) / rect.height : 0
      const inside = px >= 0 && px <= 1 && py >= 0 && py <= 1
      ctx.write('local-pointer-x-ratio', round4(px))
      ctx.write('local-pointer-y-ratio', round4(py))
      ctx.write('local-pointer-inside', inside ? 1 : 0)
    }

    const offMove = onWindow('pointermove', onMove)
    const offScroll = onWindow('scroll', updateRect)
    const offResize = onWindow('resize', updateRect)
    const offRO = observeResize(el, updateRect)

    return () => {
      offMove()
      offScroll()
      offResize()
      offRO()
    }
  },
}
