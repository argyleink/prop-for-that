import type { Source } from '../core/types'
import { onWindow } from '../core/window-events'
import { observeResize } from '../core/observers'

/**
 * `--live-px`, `--live-py` (0–1 within the element's box),
 * `--live-pointer-inside` (0/1).
 *
 * The element's rect is cached and refreshed on resize/scroll so pointer moves
 * never trigger layout reads.
 */
export const pointerLocal: Source = {
  key: 'pointer-local',
  scope: 'element',
  start(ctx) {
    const el = ctx.target
    let rect = el.getBoundingClientRect()
    const refresh = () => {
      rect = el.getBoundingClientRect()
    }

    const onMove = (e: PointerEvent) => {
      const px = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0
      const py = rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0
      const inside = px >= 0 && px <= 1 && py >= 0 && py <= 1
      ctx.write('px', Math.round(px * 1e4) / 1e4)
      ctx.write('py', Math.round(py * 1e4) / 1e4)
      ctx.write('pointer-inside', inside ? 1 : 0)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    const offScroll = onWindow('scroll', refresh)
    const offResize = observeResize(el, refresh)
    return () => {
      window.removeEventListener('pointermove', onMove)
      offScroll()
      offResize()
    }
  },
}
