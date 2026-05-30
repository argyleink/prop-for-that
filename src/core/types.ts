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
  /** Key used in `data-prop` / `propsFor()`. */
  key: string
  scope: Scope
  /** Optional `@property` typings per local name, applied when `typed` is on. */
  props?: Record<string, PropSpec>
  /** Attach listeners/observers, seed initial values, return a disposer. */
  start(ctx: SourceContext): Disposer
}
