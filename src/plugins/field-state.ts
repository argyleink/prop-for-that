import type { Source } from '../core/types'
import { type FieldElement, fieldsOf } from './_fields'

/** A field's current "value" as a comparable string, across input kinds. */
const valueOf = (el: FieldElement): string =>
  el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')
    ? el.checked
      ? '1'
      : '0'
    : el.value

/** The value a control will hold *after* a form reset (its default), comparably. */
const resetValueOf = (el: FieldElement): string => {
  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio'))
    return el.defaultChecked ? '1' : '0'
  if (el instanceof HTMLSelectElement) {
    const def = Array.from(el.options).find((o) => o.defaultSelected)
    return def ? def.value : (el.options[0]?.value ?? '')
  }
  return el.defaultValue // input (text-like) + textarea
}

/**
 * The interaction-history states form libraries track (Angular, Formik, React
 * Hook Form, final-form) but CSS pseudo-classes can't express — all `0`/`1`:
 *
 * - `--live-dirty` / `--live-pristine` — the user has edited a field *at all*
 *   since it mounted. Latches on the first `input`/`change` and stays there even
 *   if you type the value back (Angular's `.dirty`). `pristine` is the inverse.
 * - `--live-touched` / `--live-untouched` — a field has been blurred at least
 *   once. Latches on the first blur (Angular's `.touched`); `untouched` inverts it.
 * - `--live-changed` — the *current* value differs from the value at mount
 *   (React Hook Form's per-field dirty). Unlike `dirty` it un-latches when you
 *   type back to the original.
 * - `--live-submitted` — the owning `<form>` has been submitted (RHF's
 *   `isSubmitted`). Latches on `submit`, clears on `reset`.
 *
 * Both latch pairs reset when the owning form is reset.
 *
 * **Bind it to a single field** for that field's state, or **to a `<form>` (or
 * any wrapper)** for the *aggregate* across every field inside it — exactly like
 * a framework's form-group vs. control state. Aggregated: `dirty`/`touched`/
 * `changed` are on if *any* field is; `submitted` is the form's. Props land on
 * the bound element, so labels, hints, and a submit button can all style from
 * them (e.g. reveal errors only once `--live-touched` or `--live-submitted`).
 *
 * Validity stays in the `field` plugin (`--live-valid`); focus stays in `:focus`.
 */
export const fieldState: Source = {
  key: 'field-state',
  scope: 'element',
  // Event-driven, and it holds latched interaction history (dirty/touched/
  // changed) plus the per-field `initial` snapshot. Gating would tear `start`
  // down off screen and re-run it on re-entry, re-snapshotting `initial` from
  // the *current* (already-edited) values and wiping the latches — so a field
  // scrolled away and back would silently report pristine again. Run ungated.
  gate: false,
  start(ctx) {
    const fields = fieldsOf(ctx.target)
    if (!fields.length) return () => {}

    const inScope = new Set<FieldElement>(fields)
    const initial = new WeakMap<FieldElement, string>()
    for (const f of fields) initial.set(f, valueOf(f))

    // per-field latches; the written flag is the aggregate (any field → on)
    const dirtyEls = new Set<FieldElement>()
    const touchedEls = new Set<FieldElement>()
    const changedEls = new Set<FieldElement>()
    let submitted = false

    const flush = () => {
      const dirty = dirtyEls.size > 0
      const touched = touchedEls.size > 0
      ctx.write('dirty', dirty ? 1 : 0)
      ctx.write('pristine', dirty ? 0 : 1)
      ctx.write('touched', touched ? 1 : 0)
      ctx.write('untouched', touched ? 0 : 1)
      ctx.write('changed', changedEls.size > 0 ? 1 : 0)
      ctx.write('submitted', submitted ? 1 : 0)
    }
    flush() // seed so every var() resolves on frame one

    const onEdit = (e: Event) => {
      const f = e.target as FieldElement
      if (!inScope.has(f)) return
      dirtyEls.add(f)
      if (valueOf(f) === initial.get(f)) changedEls.delete(f)
      else changedEls.add(f)
      flush()
    }
    const onBlur = (e: Event) => {
      const f = e.target as FieldElement
      if (!inScope.has(f)) return
      touchedEls.add(f)
      flush()
    }

    // input/change/focusout all bubble, so one delegated set covers every field
    ctx.target.addEventListener('input', onEdit, { passive: true })
    ctx.target.addEventListener('change', onEdit, { passive: true }) // checkbox/radio/<select>
    ctx.target.addEventListener('focusout', onBlur, { passive: true })

    const form = ctx.target instanceof HTMLFormElement ? ctx.target : fields[0]?.form
    const onSubmit = () => {
      submitted = true
      flush()
    }
    const onReset = () => {
      dirtyEls.clear()
      touchedEls.clear()
      submitted = false
      // reset restores each control to its default; recompute `changed` against
      // that synchronously, so we don't race the event's default action.
      changedEls.clear()
      for (const f of fields) if (resetValueOf(f) !== initial.get(f)) changedEls.add(f)
      flush()
    }
    form?.addEventListener('submit', onSubmit, { passive: true })
    form?.addEventListener('reset', onReset, { passive: true })

    return () => {
      ctx.target.removeEventListener('input', onEdit)
      ctx.target.removeEventListener('change', onEdit)
      ctx.target.removeEventListener('focusout', onBlur)
      form?.removeEventListener('submit', onSubmit)
      form?.removeEventListener('reset', onReset)
    }
  },
}
