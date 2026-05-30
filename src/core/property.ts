import { config } from './config'
import type { PropSpec } from './types'

const registered = new Set<string>()

/**
 * Register a custom property with `@property` so it becomes typed and
 * interpolatable, with a guaranteed initial value. Idempotent, feature-detected,
 * and tolerant of a name already registered by the page or another library.
 * `inherits` defaults to true, which the container-bound element sources require.
 *
 * The initial value resolves: consumer `config.defaults[localName]` wins, then a
 * source-declared `props[localName].initial`, then `'0'`.
 */
export function registerTyped(
  name: string,
  localName?: string,
  sourceProps?: Record<string, PropSpec>,
): void {
  if (registered.has(name)) return // fast path: no work, no allocation
  if (typeof CSS === 'undefined' || typeof CSS.registerProperty !== 'function') return
  registered.add(name) // mark first: never retry per write, even on failure

  const spec = localName ? sourceProps?.[localName] : undefined
  const override = localName ? config.defaults?.[localName] : undefined
  try {
    CSS.registerProperty({
      name,
      syntax: spec?.syntax ?? '<number>',
      inherits: spec?.inherits ?? true,
      initialValue: override != null ? String(override) : (spec?.initial ?? '0'),
    })
  } catch {
    // already registered, or initial-value invalid for the syntax: leave as-is
  }
}
