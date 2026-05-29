import { config } from './core/config'
import { writer } from './core/writer'
import { coreSources } from './sources'
import type { Cadence, Config, Disposer, Source, SourceContext } from './core/types'

export type { Cadence, Config, Disposer, Source, SourceContext }
export { config }

/** Active source disposers, keyed by target then source key. */
const bindings = new WeakMap<HTMLElement, Map<string, Disposer>>()

const registry: Record<string, Source> = { ...coreSources }

/** Register a custom source so it can be used by key via `bind`/`global`/`data-prop`. */
export function register(source: Source): void {
  registry[source.key] = source
}

/** Override prefixes or the global root target. */
export function configure(opts: Partial<Config>): void {
  Object.assign(config, opts)
}

function makeContext(target: HTMLElement): SourceContext {
  return {
    target,
    config,
    write(localName, value, cadence: Cadence = 'live') {
      const prefix = cadence === 'const' ? config.constPrefix : config.livePrefix
      writer.set(target, prefix + localName, String(value))
    },
  }
}

/** Attach sources (by key) to an element. Re-binding an active key is a no-op. */
export function bind(target: HTMLElement, keys: string[]): Disposer {
  let active = bindings.get(target)
  if (!active) bindings.set(target, (active = new Map()))
  for (const key of keys) {
    if (active.has(key)) continue
    const source = registry[key]
    if (!source) {
      console.warn(`[prop-for-that] unknown source "${key}"`)
      continue
    }
    active.set(key, source.start(makeContext(target)))
  }
  return () => unbind(target, keys)
}

/** Detach specific source keys, or all of them when `keys` is omitted. */
export function unbind(target: HTMLElement, keys?: string[]): void {
  const active = bindings.get(target)
  if (!active) return
  for (const key of keys ?? [...active.keys()]) {
    active.get(key)?.()
    active.delete(key)
  }
  if (active.size === 0) bindings.delete(target)
}

/** Attach global sources to `config.root` (`:root` by default). */
export function global(keys: string[]): Disposer {
  return bind(config.root, keys)
}
