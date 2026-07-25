import type { Disposer, Source } from '../core/types'
import { round4 } from '../core/num'
import { noop } from '../core/noop'
import { onFrame } from '../core/frame'
import { onAll } from '../core/events'
import { fieldsOf } from './_fields'

/**
 * Form-level **validity & completion** that CSS can't compute. `:invalid` matches
 * a *single* control, but CSS can't count across a form or gate on "all valid" —
 * so this aggregates a form's constraint-validation state into readable numbers,
 * all written on the bound element:
 *
 * - `--live-field-count` — controls subject to constraint validation (excludes
 *   disabled / readonly / buttons / hidden — i.e. `willValidate === false`).
 * - `--live-valid-count` / `--live-invalid-count` — how many currently pass / fail.
 * - `--live-all-valid` (`1`/`0`) — the submit gate: no invalid controls remain.
 * - `--live-completion` (0–1) — how much of the *required* part of the form is
 *   satisfied (valid required controls ÷ required controls; `1` if none required).
 *
 * Bind it to a `<form>` (or any wrapper holding fields). It pairs with
 * `field-state` (interaction history) and the `field` plugin (per-field
 * `--live-valid`): use `field` on a control, `form-state` on the form.
 */
export const formState: Source = {
  key: 'form-state',
  scope: 'element',
  // Event-driven (`input`/`change`/`reset`): gating would only re-run the
  // `fieldsOf` query on every viewport re-entry for no benefit. Run ungated.
  gate: false,
  start(ctx) {
    const fields = fieldsOf(ctx.target)
    if (!fields.length) return noop

    const update = () => {
      let total = 0
      let valid = 0
      let requiredTotal = 0
      let requiredValid = 0
      for (const f of fields) {
        if (!f.willValidate) continue // disabled / readonly / barred from validation
        total++
        const ok = f.validity.valid
        if (ok) valid++
        if (f.required) {
          requiredTotal++
          if (ok) requiredValid++
        }
      }
      ctx.write('field-count', total)
      ctx.write('valid-count', valid)
      ctx.write('invalid-count', total - valid)
      ctx.write('all-valid', total === valid ? 1 : 0)
      ctx.write('completion', requiredTotal ? round4(requiredValid / requiredTotal) : 1)
    }
    update() // seed

    // validity changes synchronously with the value, so input/change is enough
    const offEdit = onAll(ctx.target, ['input', 'change'], update)

    // A reset reverts control values *after* this event's default action, so
    // validity has to be recomputed a frame later, once the new values are in
    // place. That rides the shared frame loop like everything else — a one-shot
    // sampler that unregisters itself — rather than a stray requestAnimationFrame.
    let offFrame: Disposer | null = null
    const stopFrame = () => {
      offFrame?.()
      offFrame = null
    }
    const form = ctx.target instanceof HTMLFormElement ? ctx.target : fields[0]?.form
    const onReset = () => {
      stopFrame()
      offFrame = onFrame(() => {
        stopFrame()
        update()
      })
    }
    form?.addEventListener('reset', onReset, { passive: true })

    return () => {
      stopFrame()
      offEdit()
      form?.removeEventListener('reset', onReset)
    }
  },
}
