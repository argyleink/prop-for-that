import type { Source } from '../core/types'
import { onWindow } from '../core/window-events'

/**
 * `--live-page-focused` (1/0) — whether the document currently has focus: the
 * tab is frontmost *and* its window is focused. Goes `0` when the user switches
 * to another tab, window, or app, and back to `1` on return. Driven by window
 * `focus`/`blur`, seeded from `document.hasFocus()`.
 *
 * Note: a blurred-but-still-visible window (e.g. clicking another app side by
 * side) keeps rAF alive, so the `0` flushes and CSS can react. Switching tabs
 * pauses rAF, so the change applies on return — invisible while hidden anyway.
 */
export const pageFocused: Source = {
  key: 'page-focused',
  scope: 'global',
  start(ctx) {
    const update = () => ctx.write('page-focused', document.hasFocus() ? 1 : 0)
    update()
    const offFocus = onWindow('focus', update)
    const offBlur = onWindow('blur', update)
    return () => {
      offFocus()
      offBlur()
    }
  },
}
