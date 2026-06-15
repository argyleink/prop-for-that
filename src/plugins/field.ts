import type { Source } from '../core/types'
import { resolveTarget } from '../core/find'
import { round4 } from '../core/num'

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

/**
 * The `ValidityState` flags CSS can't tell apart. `:invalid` says *a* constraint
 * failed; these say *which* (each `1`/`0`), so a hint can target the real reason.
 */
const VALIDITY: [keyof ValidityState, string][] = [
  ['valueMissing', 'value-missing'],
  ['typeMismatch', 'type-mismatch'],
  ['patternMismatch', 'pattern-mismatch'],
  ['tooLong', 'too-long'],
  ['tooShort', 'too-short'],
  ['rangeUnderflow', 'range-underflow'],
  ['rangeOverflow', 'range-overflow'],
  ['stepMismatch', 'step-mismatch'],
  ['badInput', 'bad-input'],
  ['customError', 'custom-error'],
]

/**
 * For form fields: `--live-length` (value length), `--live-empty` (0/1),
 * `--live-valid` (0/1 from `el.validity.valid`).
 *
 * Plus the per-reason validity flags CSS can't distinguish (each 0/1):
 * `--live-value-missing`, `--live-type-mismatch`, `--live-pattern-mismatch`,
 * `--live-too-long`, `--live-too-short`, `--live-range-underflow`,
 * `--live-range-overflow`, `--live-step-mismatch`, `--live-bad-input`,
 * `--live-custom-error` — so a hint can react to the *specific* failure.
 *
 * And, when the field has a `maxlength` (inputs + textareas): `--live-remaining`
 * (chars left) and `--live-fill-pct` (length ÷ maxlength, 0–1) for a pure-CSS
 * character counter. Neither is written without a `maxlength`, so keep a
 * `var(--live-remaining, …)` fallback.
 *
 * Bind it to the field itself, or to a container that holds one. When bound to
 * a container the props are written on the container, so the field *and* sibling
 * readers (a counter, a meter, a status word) all inherit them downward.
 */
export const field: Source = {
  key: 'field',
  scope: 'element',
  // Event-driven (`input`/`change`): no continuous work to pause off screen, so
  // skip the viewport gate and its IntersectionObserver subscription.
  gate: false,
  start(ctx) {
    const el = resolveTarget<FieldElement>(ctx.target, 'input, textarea, select')
    if (!el) return () => {}

    const update = () => {
      const length = el.value.length
      ctx.write('length', length)
      ctx.write('empty', length === 0 ? 1 : 0)
      ctx.write('valid', el.validity.valid ? 1 : 0)
      for (const [flag, name] of VALIDITY) ctx.write(name, el.validity[flag] ? 1 : 0)
      // maxLength is -1 when unset, and absent on <select> — only budget when capped
      const max = (el as HTMLInputElement | HTMLTextAreaElement).maxLength
      if (max >= 0) {
        ctx.write('remaining', Math.max(0, max - length))
        ctx.write('fill-pct', max > 0 ? round4(Math.min(1, length / max)) : 0)
      }
    }
    update()
    const events = ['input', 'change'] // change covers <select>
    for (const type of events) el.addEventListener(type, update, { passive: true })
    return () => {
      for (const type of events) el.removeEventListener(type, update)
    }
  },
}
