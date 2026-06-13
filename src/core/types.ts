export type Cadence = 'live' | 'const'
export type Scope = 'global' | 'element'

export type Disposer = () => void

export interface Config {
  /** Prefix for continuously-updated values. */
  livePrefix: string
  /** Prefix for write-once constants. */
  constPrefix: string
  /** Where global sources write. */
  root: HTMLElement
  /**
   * When true, written `--live-*` properties are registered with `@property`
   * (via `CSS.registerProperty`) as typed, interpolatable custom properties with
   * a guaranteed initial value. Opt in with `configure({ typed: true })` before
   * attaching sources. Off by default.
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
