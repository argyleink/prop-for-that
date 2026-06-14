import type { Source } from '../core/types'
import { onWindow } from '../core/window-events'
import { observeResize } from '../core/observers'
import { round4 } from '../core/num'

/**
 * `--live-local-pointer-x-ratio`, `--live-local-pointer-y-ratio` (0–1 within the
 * element's box), `--live-local-pointer-inside` (0/1).
 *
 * Shares the page's single `pointermove` listener. The element's bounding rect
 * is cached at `start()` and refreshed lazily via `requestAnimationFrame` —
 * never synchronously inside any event handler.
 *
 * Why: on macOS trackpads both `pointermove` and `scroll` fire at 120 Hz+.
 * With `typed: true` the rAF flush writes `--live-*` properties registered as
 * `@property inherits: true`, marking the full document cascade dirty. Calling
 * `getBoundingClientRect()` while the cascade is dirty forces Firefox to
 * synchronously re-resolve inherited custom properties across all DOM elements.
 * At 120 Hz this saturates the CPU and crashes the renderer process. Deferring
 * the read to a rAF callback limits cascade resolution to at most once per
 * rendered frame, which Firefox handles without issue.
 */
export const pointerLocal: Source = {
  key: 'pointer-local',
  scope: 'element',
  start(ctx) {
    const el = ctx.target
    let rect = el.getBoundingClientRect()
    let rafId = 0

    // Schedule a one-shot rAF to refresh the cached rect. Multiple scroll or
    // resize events between frames collapse into a single read.
    const scheduleRectUpdate = () => {
      if (rafId) return
      if (typeof requestAnimationFrame !== 'function') {
        // SSR / environments without rAF: update synchronously
        rect = el.getBoundingClientRect()
        return
      }
      rafId = requestAnimationFrame(() => {
        rect = el.getBoundingClientRect()
        rafId = 0
      })
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
    const offScroll = onWindow('scroll', scheduleRectUpdate)
    const offResize = onWindow('resize', scheduleRectUpdate)
    const offRO = observeResize(el, scheduleRectUpdate)

    return () => {
      if (rafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId)
      offMove()
      offScroll()
      offResize()
      offRO()
    }
  },
}
