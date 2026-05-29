import type { Source } from '../../core/types'

/** `--live-value`, `--live-value-pct` (0–1 across min/max) for `<input type="range|number">` */
export const range: Source = {
  key: 'range',
  scope: 'element',
  start(ctx) {
    const el = ctx.target as HTMLInputElement
    const update = () => {
      const min = el.min === '' ? 0 : Number(el.min)
      const max = el.max === '' ? 100 : Number(el.max)
      const value = Number(el.value)
      ctx.write('value', value)
      ctx.write(
        'value-pct',
        max > min ? Math.round(((value - min) / (max - min)) * 1e4) / 1e4 : 0,
      )
    }
    update()
    el.addEventListener('input', update, { passive: true })
    return () => el.removeEventListener('input', update)
  },
}
