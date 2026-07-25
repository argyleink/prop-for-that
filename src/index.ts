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

/** Options for the element-targeted `propsFor`. */
export interface PropsForOptions {
  /**
   * Write this binding's properties on an **ancestor** instead of the bound
   * element — a selector resolved with `el.closest()`, or an explicit element.
   * The bound element is still the one observed.
   *
   * Custom properties inherit downward only, and `@container style()` matches
   * against an *ancestor*, so an element can neither style-query nor share the
   * values written on itself. Hoisting to a wrapper is what lets the element's
   * siblings — and the element itself — react to them.
   *
   * No `closest()` match warns and falls back to the element itself; `to` on a
   * `global` source warns and is ignored. Keep it to **one binding per key per
   * target**: two elements hoisting the same key to one ancestor overwrite each
   * other (dev-time warning).
   */
  to?: Element | string
}

interface Entry {
  dispose: Disposer
  written: Set<string>
  /** Where this binding's props land: the bound element unless hoisted via `to`. */
  writeTarget: HTMLElement
}

const noop: Disposer = () => {}

/** target → (key → live binding). A strong map so `reset()` can tear everything down. */
const bindings = new Map<HTMLElement, Map<string, Entry>>()
/** writeTarget → keys currently hoisted onto it, to warn when two bindings collide. */
const hoisted = new WeakMap<HTMLElement, Set<string>>()
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
  writeTarget: HTMLElement,
  written: Set<string>,
  props?: Source['props'],
): SourceContext {
  // Per-binding memo, keyed by localName within each cadence: the last raw value
  // (so a redundant write exits after one lookup, before any stringify/queue
  // work — the steady state for most sources) and the prefixed property name
  // (built once; prefixes are fixed once sources attach, per `configure`'s
  // contract). The ctx survives viewport-gate restarts, whose re-seeds this
  // memo also absorbs; it dies with the binding, alongside `writer`'s cache.
  const memo = {
    live: new Map<string, { raw: unknown; prop: string }>(),
    const: new Map<string, { raw: unknown; prop: string }>(),
  }
  // `target` is what the source observes; `writeTarget` is where its properties
  // land — the same element unless the binding hoisted them with `to`.
  return {
    target,
    config,
    write(localName, value, cadence: Cadence = 'live') {
      const m = memo[cadence]
      let entry = m.get(localName)
      if (entry) {
        if (entry.raw === value) return // unchanged, skip
        entry.raw = value
      } else {
        const prop = (cadence === 'const' ? config.constPrefix : config.livePrefix) + localName
        m.set(localName, (entry = { raw: value, prop }))
        written.add(prop)
      }
      if (config.typed) registerTyped(entry.prop, localName, props)
      writer.set(writeTarget, entry.prop, String(value))
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
  const { writeTarget } = entry
  const style = styleFor(writeTarget)
  for (const prop of entry.written) {
    style.removeProperty(prop)
    writer.forget(writeTarget, prop)
  }
  if (writeTarget !== target) hoisted.get(writeTarget)?.delete(key)
  active.delete(key)
}

/** Resolve `opts.to` to the element a binding writes on. Degrades to the bound
 *  element (with a warning) when a selector matches no ancestor, so the props
 *  still exist — only the sharing is lost. */
function resolveWriteTarget(target: HTMLElement, to: Element | string): HTMLElement {
  if (typeof to !== 'string') return to as HTMLElement
  const found = target.closest<HTMLElement>(to)
  if (found) return found
  console.warn(
    `[prop-for-that] no ancestor matches "${to}" — writing on the element itself`,
  )
  return target
}

/** Dev-time collision check: two bindings hoisting one key onto the same element
 *  overwrite each other's values, and disposing either strips the property. */
function claimHoist(writeTarget: HTMLElement, key: string): void {
  let keys = hoisted.get(writeTarget)
  if (!keys) hoisted.set(writeTarget, (keys = new Set()))
  if (keys.has(key)) {
    console.warn(
      `[prop-for-that] "${key}" is already hoisted onto this element — the bindings will overwrite each other`,
      writeTarget,
    )
  }
  keys.add(key)
}

function startOn(target: HTMLElement, keys: string[], to?: Element | string): Disposer {
  let active = bindings.get(target)
  if (!active) bindings.set(target, (active = new Map()))
  const hoist = to ? resolveWriteTarget(target, to) : target

  const started: string[] = []
  for (const key of keys) {
    if (active.has(key)) continue // already active on this element (`to` and all)
    const source = registry[key]
    if (!source) {
      console.warn(`[prop-for-that] unknown source "${key}"`)
      continue
    }
    // Globals aren't the element's state to hoist — they already write to a
    // shared target (`config.root` in the global form). Leave them where they are.
    let writeTarget = hoist
    if (writeTarget !== target && source.scope === 'global') {
      console.warn(`[prop-for-that] "to" ignored for global source "${key}"`)
      writeTarget = target
    }
    const written = new Set<string>()
    let dispose: Disposer
    try {
      dispose = attach(source, makeContext(target, writeTarget, written, source.props), target)
    } catch (err) {
      console.error(`[prop-for-that] source "${key}" failed to start`, err)
      continue
    }
    if (writeTarget !== target) claimHoist(writeTarget, key)
    active.set(key, { dispose, written, writeTarget })
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
 * `opts.to` hoists the writes to an ancestor (selector or element) while still
 * observing the bound element, so siblings can read the values:
 *
 *   propsFor(img, ['img'], { to: 'figure' })
 *
 * Returns a disposer that tears down exactly what this call started and removes
 * the custom properties it wrote.
 */
export function propsFor(keys: SourceKey[]): Disposer
export function propsFor(
  target: Element | NodeList | HTMLCollection | Element[],
  keys: SourceKey[],
  opts?: PropsForOptions,
): Disposer
export function propsFor(a: unknown, b?: SourceKey[], opts?: PropsForOptions): Disposer {
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
  const disposers = targets.map((t) => startOn(t, keys, opts?.to))
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
