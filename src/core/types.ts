export type Cadence = 'live' | 'const'
export type Scope = 'global' | 'element'

export type Disposer = () => void

export interface Config {
  /** Prefix for continuously-updated values. */
  livePrefix: string
  /** Prefix for write-once constants. */
  constPrefix: string
  /**
   * Where global sources write. Typed non-nullable for consumers' sake, but it
   * really is `undefined` without a document — the internals guard it, and so
   * should a custom source that reads it (`ctx.config.root`) outside the browser.
   */
  root: HTMLElement
  /**
   * When true, written properties are registered with `@property`
   * (via `CSS.registerProperty`) as typed, interpolatable custom properties with
   * a guaranteed initial value. Applies to both cadences — `--const-*` values
   * are registered too, which is what lets string constants like `--const-ua-*`
   * survive typing. Opt in with `configure({ typed: true })` before attaching
   * sources. Off by default.
   *
   * A source's **string** values are only registered when the source declares a
   * `props` entry for them (`ua`, `nav-type`, `color-input`, the colour
   * plugins). Undeclared strings are left untyped rather than registered as the
   * `<number>` default, which would reject the value and compute to `0` — see
   * `meta`, whose property names are discovered at runtime.
   */
  typed: boolean
  /**
   * Initial (default) values for typed properties, keyed by a source's local
   * name (e.g. `'pointer-x-ratio'`). Applied as the `@property` initial-value
   * when `typed` is on, overriding a source's declared initial and the `0`
   * default. The value must be valid for the property's syntax.
   */
  defaults?: Record<string, string | number>
  /**
   * Optional cap (in Hz) on how often the shared frame loop samples and flushes.
   * Unset (the default) runs every animation frame. Setting e.g. `30` coalesces
   * writes to at most 30/sec — fewer custom-property mutations means less style
   * recalc and a calmer DevTools Styles panel, at the cost of update smoothness.
   * Throttles the whole loop (sampling included), so per-frame samplers like
   * `fps`/`scroll-velocity` measure at this rate too.
   */
  liveHz?: number
  /**
   * Seed for the `random` plugin. When set, each element's rolls are derived from
   * this seed plus the element's position in the DOM instead of `Math.random()`,
   * so the same markup renders the same "random" layout on every load — and a
   * rebind hands an element the values it had before. Unset (the default) means
   * genuinely random per load. Any integer works; `0` is a valid seed.
   */
  randomSeed?: number
}

/** Optional `@property` typing for a source's local name, used when `typed` is on. */
export interface PropSpec {
  /** CSS `@property` syntax. Default `'<number>'`. */
  syntax?: string
  /** Initial value. Default `'0'`. */
  initial?: string
  /** Whether the property inherits. Default `true` (required for container-bound sources). */
  inherits?: boolean
}

export interface SourceContext {
  /** The element this source instance is attached to (`config.root` for globals). */
  target: HTMLElement
  config: Config
  /**
   * Queue a value for the next batched flush. `localName` is prefixed by cadence
   * (e.g. `write('pointer-x', 12)` → `--live-pointer-x: 12`).
   *
   * Writing the **empty string** removes the property, so a value that stops
   * being meaningful (a `<select>` whose new option isn't numeric) falls back to
   * the consumer's `var(--live-x, …)` again instead of going stale. Under
   * `typed: true` a removed property computes to its registered initial value
   * rather than the `var()` fallback.
   */
  write(localName: string, value: number | string, cadence?: Cadence): void
}

export interface Source {
  /** Key used in `data-props-for` / `propsFor()`. */
  key: string
  scope: Scope
  /** Optional `@property` typings per local name, applied when `typed` is on. */
  props?: Record<string, PropSpec>
  /**
   * Viewport-visibility gating for element-scoped sources. When a binding's
   * target is outside the viewport the binding layer stops the source's work
   * (listeners/observers/timers) and freezes its last-written values, resuming
   * on re-entry — so nothing is computed for elements the user can't see.
   *
   * Defaults to `true` for `scope: 'element'`. Set `false` to opt out — used by
   * `visibility`, which must keep observing to *report* visibility. Global
   * sources (and bindings on `:root`) are never gated.
   */
  gate?: boolean
  /**
   * Attach listeners/observers, seed initial values, return a disposer.
   *
   * For gated `element` sources this is **re-invoked on every viewport re-entry**
   * (and the disposer on every exit), so it must be cheap and idempotent, and it
   * must seed current values every time — a source that only attaches listeners
   * without seeding will show stale (frozen) values after each off-screen→on-screen
   * cycle. If `start` does expensive work (canvas sampling, decoding, large
   * allocation), memoize it or set `gate: false` and pause internally.
   */
  start(ctx: SourceContext): Disposer
}
