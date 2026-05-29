import type { Source } from '../core/types'

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

/**
 * For form fields: `--live-length` (value length), `--live-empty` (0/1),
 * `--live-valid` (0/1 from `el.validity.valid`).
 */
export const field: Source = {
  key: 'field',
  scope: 'element',
  start(ctx) {
    const el = ctx.target as FieldElement
    const update = () => {
      const length = el.value.length
      ctx.write('length', length)
      ctx.write('empty', length === 0 ? 1 : 0)
      ctx.write('valid', el.validity.valid ? 1 : 0)
    }
    update()
    el.addEventListener('input', update, { passive: true })
    return () => el.removeEventListener('input', update)
  },
}
