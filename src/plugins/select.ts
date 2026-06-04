import type { Source } from '../core/types'
import { resolveTarget } from '../core/find'
import { round4 } from '../core/num'

/**
 * A native `<select>`'s state as numbers CSS can compute with. CSS can match
 * `:open`, `:checked` (on `<option>`s under `appearance: base-select`) and
 * `:focus` — but it can never get *which* option, *as a number*, into `calc()`,
 * nor count selections in a `<select multiple>`. This does:
 *
 * - `--live-index` — `selectedIndex` (0-based; `-1` when nothing is selected).
 *   Turns a `<select>` into a discrete CSS state machine: slide a segmented-
 *   control indicator with `translate: calc(var(--live-index) * 100%) 0`, or pick
 *   the Nth palette/theme. With `configure({ typed: true })` the index animates.
 * - `--live-option-count` — `options.length`.
 * - `--live-index-pct` — `index ÷ (count − 1)`, 0–1: the choice's position in the
 *   list (`0` for a one-option list or nothing selected).
 * - `--live-value-num` — `Number(value)` *when the chosen value is numeric*, so a
 *   choice's meaning drives layout directly:
 *   `grid-template-columns: repeat(var(--live-value-num), 1fr)`. Not written for a
 *   non-numeric value — keep a `var(--live-value-num, …)` fallback.
 * - `--live-selected-count` — how many options are selected (the count CSS can't
 *   compute: `:checked` matches them, nothing tallies them). `1`/`0` for a single
 *   select; `0`…N for `<select multiple>`.
 * - `--live-selected-pct` — `selected-count ÷ option-count`, 0–1: a multi-select
 *   fill ratio.
 *
 * Bind the `<select>` itself, or a container holding one (props land on the
 * container, so a sibling readout/indicator inherits them downward).
 */
export const select: Source = {
  key: 'select',
  scope: 'element',
  start(ctx) {
    const el = resolveTarget<HTMLSelectElement>(ctx.target, 'select')
    if (!el) return () => {}

    const update = () => {
      const count = el.options.length
      const index = el.selectedIndex
      const selected = el.selectedOptions.length
      ctx.write('index', index)
      ctx.write('option-count', count)
      ctx.write('index-pct', index >= 0 && count > 1 ? round4(index / (count - 1)) : 0)
      ctx.write('selected-count', selected)
      ctx.write('selected-pct', count > 0 ? round4(selected / count) : 0)
      const n = Number(el.value)
      if (el.value.trim() !== '' && Number.isFinite(n)) ctx.write('value-num', n)
    }
    update()
    const events = ['input', 'change'] // change is the reliable one; input covers live multi-select
    for (const type of events) el.addEventListener(type, update, { passive: true })
    return () => {
      for (const type of events) el.removeEventListener(type, update)
    }
  },
}
