import type { Source } from '../core/types'
import { observeResize } from '../core/observers'

/**
 * Whether an element's own text is being clipped right now — the "is the
 * ellipsis showing?" question CSS can ask of a scroll container (`scroll-state()`)
 * but never of overflowing text. Bind it to the element whose overflow you care
 * about; all `1`/`0`:
 *
 * - `--live-truncated` — clipped on *either* axis.
 * - `--live-truncated-x` — inline clip: the classic `text-overflow: ellipsis` on
 *   a `white-space: nowrap; overflow: hidden` line (`scrollWidth > clientWidth`).
 * - `--live-truncated-y` — block clip: a `-webkit-line-clamp` / fixed-height
 *   `overflow: hidden` box whose lines run past it (`scrollHeight > clientHeight`).
 *
 * Reveal a "more" affordance, a tooltip trigger, or an expand control only while
 * text is actually cut off — `@container style(--live-truncated: 1) { … }` — and
 * have it disappear the moment a wider box fits the text. Recomputed whenever the
 * box resizes (the shared `ResizeObserver`), so responsive truncation flips both
 * ways as the layout reflows.
 */
export const truncated: Source = {
  key: 'truncated',
  scope: 'element',
  start(ctx) {
    const el = ctx.target
    const measure = () => {
      const x = el.scrollWidth > el.clientWidth ? 1 : 0
      const y = el.scrollHeight > el.clientHeight ? 1 : 0
      ctx.write('truncated', x || y ? 1 : 0)
      ctx.write('truncated-x', x)
      ctx.write('truncated-y', y)
    }
    measure() // seed so every var() resolves on frame one
    return observeResize(el, measure)
  },
}
