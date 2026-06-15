import type { Source } from '../../core/types'
import { resolveTarget } from '../../core/find'
import { round4 } from '../../core/num'

/**
 * `--live-value`, `--live-value-pct` (0–1 across min/max).
 *
 * Bind it to the `<input type="range|number">` itself, or to a container that
 * holds one. When bound to a container the props are written on the container,
 * so the input and sibling elements (a gauge, a readout) can all read the value.
 */
export const range: Source = {
  key: 'range',
  scope: 'element',
  // Event-driven (writes only on `input`), so viewport-gating it would add an
  // IntersectionObserver subscription that buys nothing — a value can't change
  // while the control is off screen. Run ungated: attach once, seed once.
  gate: false,
  start(ctx) {
    const input = resolveTarget<HTMLInputElement>(
      ctx.target,
      'input[type="range"], input[type="number"]',
    )
    if (!input) return () => {}

    const update = () => {
      const min = input.min === '' ? 0 : Number(input.min)
      const max = input.max === '' ? 100 : Number(input.max)
      const value = Number(input.value)
      ctx.write('value', value)
      ctx.write('value-pct', max > min ? round4((value - min) / (max - min)) : 0)
    }
    update()
    input.addEventListener('input', update, { passive: true })
    return () => input.removeEventListener('input', update)
  },
}
