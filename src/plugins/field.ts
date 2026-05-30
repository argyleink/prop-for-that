import type { Source } from '../core/types'
import { resolveTarget } from '../core/find'

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

/**
 * For form fields: `--live-length` (value length), `--live-empty` (0/1),
 * `--live-valid` (0/1 from `el.validity.valid`).
 *
 * Bind it to the field itself, or to a container that holds one. When bound to
 * a container the props are written on the container, so the field *and* sibling
 * readers (a counter, a meter, a status word) all inherit them downward.
 */
export const field: Source = {
  key: 'field',
  scope: 'element',
  start(ctx) {
    const el = resolveTarget<FieldElement>(ctx.target, 'input, textarea, select')
    if (!el) return () => {}

    const update = () => {
      const length = el.value.length
      ctx.write('length', length)
      ctx.write('empty', length === 0 ? 1 : 0)
      ctx.write('valid', el.validity.valid ? 1 : 0)
    }
    update()
    const events = ['input', 'change'] // change covers <select>
    for (const type of events) el.addEventListener(type, update, { passive: true })
    return () => {
      for (const type of events) el.removeEventListener(type, update)
    }
  },
}
