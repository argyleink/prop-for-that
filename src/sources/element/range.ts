import type { Source } from '../../core/types'

/**
 * `--live-value`, `--live-value-pct` (0–1 across min/max).
 *
 * Bind it to the `<input type="range|number">` itself, or to a container that
 * holds one. When bound to a container the props are written on the container,
 * so the input *and* sibling elements (a separate gauge, a numeric readout) can
 * all read the value — custom properties only inherit downward.
 */
export const range: Source = {
  key: 'range',
  scope: 'element',
  start(ctx) {
    const input = (
      ctx.target instanceof HTMLInputElement
        ? ctx.target
        : ctx.target.querySelector('input[type="range"], input[type="number"]')
    ) as HTMLInputElement | null
    if (!input) return () => {}

    const update = () => {
      const min = input.min === '' ? 0 : Number(input.min)
      const max = input.max === '' ? 100 : Number(input.max)
      const value = Number(input.value)
      ctx.write('value', value)
      ctx.write(
        'value-pct',
        max > min ? Math.round(((value - min) / (max - min)) * 1e4) / 1e4 : 0,
      )
    }
    update()
    input.addEventListener('input', update, { passive: true })
    return () => input.removeEventListener('input', update)
  },
}
