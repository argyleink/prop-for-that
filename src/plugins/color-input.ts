import type { Source } from '../core/types'
import { resolveTarget } from '../core/find'
import { colorProp } from './_color'

/**
 * The colour chosen in an `<input type="color">`, which CSS has no way to read.
 * Exposed as one sRGB hex string, `--live-color` — pull whatever channels you
 * need out of it with relative colour syntax / `color-mix()`, so a picker can
 * live-theme a whole region with zero consumer JS:
 *
 *   .panel  { background: var(--live-color); }
 *   .accent { background: oklch(from var(--live-color) l c h / 50%); }
 *
 * Typed (`configure({ typed: true })`) registers it as a `<color>`, so the theme
 * interpolates between picks. Bind the input, or a container holding one (props
 * land on the container, so siblings inherit the colour).
 */
export const colorInput: Source = {
  key: 'color-input',
  scope: 'element',
  props: { color: colorProp },
  // Event-driven (`input`/`change`): no continuous work, so skip the viewport
  // gate and its IntersectionObserver subscription.
  gate: false,
  start(ctx) {
    const el = resolveTarget<HTMLInputElement>(ctx.target, 'input[type="color"]')
    if (!el) return () => {}

    const update = () => ctx.write('color', el.value)
    update()
    const events = ['input', 'change'] // input fires while dragging the picker, change on commit
    for (const type of events) el.addEventListener(type, update, { passive: true })
    return () => {
      for (const type of events) el.removeEventListener(type, update)
    }
  },
}
