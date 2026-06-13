import { config } from './core/config'
import { writer } from './core/writer'
import { styleFor } from './core/root-style'
import { pause, resume } from './core/frame'
import { observeIntersection } from './core/observers'
import { registerTyped } from './core/property'
import { coreSources } from './sources'
import type {
  Cadence,
  Config,
  Disposer,
  PropSpec,
  Source,
  SourceContext,
} from './core/types'

export type { Cadence, Config, Disposer, PropSpec, Source, SourceContext }

type CoreKey = 'viewport' | 'size' | 'visibility' | 'range'
/** Built-in keys autocomplete; any registered/plugin key (a string) is allowed. */
export type SourceKey = CoreKey | (string & {})

interface Entry {
  dispose: Disposer
  written: Set<string>
}

const noop: Disposer = () => {}

/** target → (key → live binding). A strong map so `reset()` can tear everything down. */
const bindings = new Map<HTMLElement, Map<string, Entry>>()
const registry: Record<string, Source> = { ...coreSources }

/** Register a custom or plugin source so it can be used by key. */
export function register(source: Source): void {
  registry[source.key] = source
}

/** Remove a previously registered source key. */
export function unregister(key: string): void {
  delete registry[key]
}

/** Whether a source key is currently registered (core or added via `register`). */
export function isRegistered(key: string): boolean {
  return key in registry
}

/** Override prefixes or the global root target. Call before attaching sources. */
export function configure(opts: Partial<Config>): void {
  Object.assign(config, opts)
}

function makeContext(
  target: HTMLElement,
  written: Set<string>,
  props?: Source['props'],
): SourceContext {
  return {
    target,
    config,
    write(localName, value, cadence: Cadence = 'live') {
      const prop = (cadence === 'const' ? config.constPrefix : config.livePrefix) + localName
      written.add(prop)
      if (config.typed) registerTyped(prop, localName, props)
      writer.set(target, prop, String(value))
    },
  }
}

/**
 * Start a source, viewport-gated when it's element-scoped. While the target is
 * outside the viewport the source's work (listeners/observers/timers) is torn
 * down and its last-written values are left frozen in place — so nothing is
 * computed for elements the user can't see. Re-entry re-runs `start`, which
 * re-seeds (the diffing writer skips unchanged values).
 *
 * Gating needs IntersectionObserver; without it (SSR/jsdom) the source just runs
 * ungated. Global sources, bindings on `:root`, and `gate: false` sources (e.g.
 * `visibility`, which must keep observing to *report* visibility) are never gated.
 */
function attach(source: Source, ctx: SourceContext, target: HTMLElement): Disposer {
  const gated =
    source.scope === 'element' &&
    source.gate !== false &&
    target !== config.root &&
    typeof IntersectionObserver !== 'undefined'

  if (!gated) return source.start(ctx)

  let work: Disposer | null = null
  const startWork = () => {
    if (work) return
    try {
      work = source.start(ctx)
    } catch (err) {
      console.error(`[prop-for-that] source "${source.key}" failed to start`, err)
    }
  }
  const stopWork = () => {
    work?.()
    work = null
  }
  const offGate = observeIntersection(target, (entry) => {
    if (entry.isIntersecting) startWork()
    else stopWork()
  })
  return () => {
    offGate()
    stopWork()
  }
}

function disposeEntry(target: HTMLElement, key: string, active: Map<string, Entry>): void {
  const entry = active.get(key)
  if (!entry) return
  entry.dispose()
  const style = styleFor(target)
  for (const prop of entry.written) {
    style.removeProperty(prop)
    writer.forget(target, prop)
  }
  active.delete(key)
}

function startOn(target: HTMLElement, keys: string[]): Disposer {
  let active = bindings.get(target)
  if (!active) bindings.set(target, (active = new Map()))

  const started: string[] = []
  for (const key of keys) {
    if (active.has(key)) continue // already active on this element
    const source = registry[key]
    if (!source) {
      console.warn(`[prop-for-that] unknown source "${key}"`)
      continue
    }
    const written = new Set<string>()
    let dispose: Disposer
    try {
      dispose = attach(source, makeContext(target, written, source.props), target)
    } catch (err) {
      console.error(`[prop-for-that] source "${key}" failed to start`, err)
      continue
    }
    active.set(key, { dispose, written })
    started.push(key)
  }

  // disposes exactly what THIS call started (and only if still active)
  return () => {
    const a = bindings.get(target)
    if (!a) return
    for (const key of started) disposeEntry(target, key, a)
    if (a.size === 0) bindings.delete(target)
  }
}

function toTargets(input: unknown): HTMLElement[] {
  if (input instanceof Element) return [input as HTMLElement]
  if (
    (typeof NodeList !== 'undefined' && input instanceof NodeList) ||
    (typeof HTMLCollection !== 'undefined' && input instanceof HTMLCollection) ||
    Array.isArray(input)
  ) {
    return Array.from(input as Iterable<unknown>).filter(
      (n): n is HTMLElement => n instanceof Element,
    )
  }
  return []
}

function isKeys(x: unknown): x is string[] {
  return Array.isArray(x) && (x.length === 0 || typeof x[0] === 'string')
}

/**
 * Attach sources by key. Global by default (writes to `:root`); pass a Node,
 * NodeList, or array of elements as the first argument to attach to elements.
 *
 *   propsFor(['pointer'])            // → :root
 *   propsFor(el, ['size'])           // → el
 *   propsFor(els, ['visibility'])    // → each element in a NodeList / array
 *
 * Returns a disposer that tears down exactly what this call started and removes
 * the custom properties it wrote.
 */
export function propsFor(keys: SourceKey[]): Disposer
export function propsFor(
  target: Element | NodeList | HTMLCollection | Element[],
  keys: SourceKey[],
): Disposer
export function propsFor(a: unknown, b?: SourceKey[]): Disposer {
  let targets: HTMLElement[]
  let keys: string[]
  if (b === undefined && isKeys(a)) {
    targets = config.root ? [config.root] : [] // global, SSR-safe
    keys = a
  } else {
    targets = toTargets(a)
    keys = (b ?? []) as string[]
  }
  if (!targets.length || !keys.length) return noop
  const disposers = targets.map((t) => startOn(t, keys))
  return () => {
    for (const d of disposers) d()
  }
}

/** Detach specific keys from an element, or all of them. Removes written props. */
export function unbind(target: HTMLElement, keys?: string[]): void {
  const active = bindings.get(target)
  if (!active) return
  for (const key of keys ?? [...active.keys()]) disposeEntry(target, key, active)
  if (active.size === 0) bindings.delete(target)
}

/** Tear down every active binding (and, via ref-counting, the shared observers
 *  and listeners they used). Useful for SPA route changes, HMR, and tests. */
export function reset(): void {
  for (const [target, active] of bindings) {
    for (const key of [...active.keys()]) disposeEntry(target, key, active)
  }
  bindings.clear()
}

/**
 * Freeze (`pause`) / unfreeze (`resume`) the shared frame loop. While paused,
 * samplers stop running and no writes flush, so the current property values
 * hold steady — handy for inspecting them in DevTools without the live churn,
 * or for halting work in a backgrounded tab. Bindings stay attached; `resume()`
 * picks up sampling and flushes anything queued meanwhile. Idempotent.
 */
export { pause, resume }
