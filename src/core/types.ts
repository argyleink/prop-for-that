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
}

export interface SourceContext {
  /** The element this source instance is attached to (`config.root` for globals). */
  target: HTMLElement
  config: Config
  /**
   * Queue a value for the next batched flush. `localName` is prefixed by cadence
   * (e.g. `write('scroll-y', 12)` → `--live-scroll-y: 12`).
   */
  write(localName: string, value: number | string, cadence?: Cadence): void
}

export interface Source {
  /** Key used in `data-prop` / `bind()` / `global()`. */
  key: string
  scope: Scope
  /** Attach listeners/observers, seed initial values, return a disposer. */
  start(ctx: SourceContext): Disposer
}
