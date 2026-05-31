import type { Source } from '../../core/types'
import { observeIntersection } from '../../core/observers'

/**
 * Binary, scroll-TRIGGERED visibility:
 * - `--live-visible` (1/0) — whether any part is currently in the viewport.
 * - `--live-has-entered` (1/0) — latches to 1 once the element is *entirely*
 *   within the viewport, and never resets.
 *
 * The continuous *ratio* is intentionally NOT exposed — that's scroll-driven and
 * belongs to native `animation-timeline: view()`. A one-way `has-entered` latch
 * (reveal once fully in, keep it) is the thing timelines can't express, since they
 * reverse on scroll-back.
 *
 * An element larger than the viewport can never be entirely visible, so its
 * `has-entered` never latches; `--live-visible` still tracks partial overlap.
 */
export const visibility: Source = {
  key: 'visibility',
  scope: 'element',
  start(ctx) {
    let entered = false
    ctx.write('visible', 0)
    ctx.write('has-entered', 0)
    return observeIntersection(ctx.target, (entry) => {
      ctx.write('visible', entry.isIntersecting ? 1 : 0)
      if (!entered && entry.intersectionRatio >= 1) {
        entered = true
        ctx.write('has-entered', 1)
      }
    })
  },
}
