import type { Source } from '../../core/types'
import { observeIntersection } from '../../core/observers'

/**
 * Binary, scroll-TRIGGERED full-element visibility:
 * - `--live-visible` (1/0) — whether the element is *entirely* within the viewport
 *   right now; flips both ways as it scrolls fully in and partially out.
 * - `--const-has-entered` (1/0) — latches to 1 the first time the element is
 *   entirely within the viewport, and never resets. It's written once, so it lives
 *   on the `const` cadence rather than `live`.
 *
 * The continuous *ratio* is intentionally NOT exposed — that's scroll-driven and
 * belongs to native `animation-timeline: view()`. A one-way `has-entered` latch
 * (reveal once fully in, keep it) is the thing timelines can't express, since they
 * reverse on scroll-back.
 *
 * An element larger than the viewport can never be entirely visible, so neither
 * signal ever turns on for it.
 */
export const visibility: Source = {
  key: 'visibility',
  scope: 'element',
  // Never viewport-gated: this source exists to *report* visibility, so it must
  // keep observing the element even while it's off screen.
  gate: false,
  start(ctx) {
    let entered = false
    ctx.write('visible', 0)
    ctx.write('has-entered', 0, 'const') // seeded so var() resolves; latches to 1 once
    return observeIntersection(ctx.target, (entry) => {
      const fully = entry.intersectionRatio >= 1
      ctx.write('visible', fully ? 1 : 0)
      if (fully && !entered) {
        entered = true
        ctx.write('has-entered', 1, 'const')
      }
    })
  },
}
