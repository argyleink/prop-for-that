# Changelog

All notable changes to **prop-for-that** are recorded here. Format follows
[Keep a Changelog](https://keepachangelog.com/). While the package is `0.x`, a
**minor** bump signals a breaking change and a **patch** bump signals a
backwards-compatible change (semver's `1.0.0`+ rules kick in at v1).

Only the published library (`dist/`) is versioned here; the demo and docs site
are repo-only and not part of the npm package.

## [0.2.0]

### Changed (breaking)
- **Unified `global()` and `bind()` into a single `propsFor()`**. It is global
  (writes to the configured root) unless the first argument is a `Node`,
  `NodeList`, or array of elements, in which case it attaches per element. Its
  disposer tears down exactly what that call started and removes the custom
  properties it wrote. The old `global` and `bind` exports are **removed**.
- **The `config` object is no longer exported.** Read or change the prefixes and
  root through `configure()`.
- **`visibility`** now writes binary, scroll-*triggered* state: `--live-visible`
  (`1`/`0`) plus `--live-has-entered` (`1`/`0`, latches on first entry and never
  resets). The continuous `--live-visible-ratio` is **removed**; use native
  `animation-timeline: view()` for continuous scroll-driven effects.
- **`range`** is now container-aware: attach it to a wrapper and it finds the inner
  `<input>`, writing `--live-value` / `--live-value-pct` on the **container** so
  the input and sibling elements (gauges, readouts) can all read the value.

### Removed (breaking)
- **Global `scroll` source** (`--live-scroll-x` / `-y` / `-progress`): superseded
  by native CSS scroll-driven animations (`animation-timeline: scroll()` /
  `view()`), which run on the compositor.
- **`el-scroll` plugin**: superseded by native `scroll(self)` / `scroll(nearest)`
  scroll timelines.

### Added
- **`propsFor()`**: one entry point for attaching sources, global or per element
  (a single element, a `NodeList`, or an array). Returns a scoped disposer.
- **`reset()`**: tears down every active binding plus the shared observers and
  listeners, for a clean slate (handy in tests and before hot reloads).
- **`unregister(key)`**: removes a source from the registry by key.
- **`SourceKey`** type export for the registry key.
- **Typed properties** via `configure({ typed: true })`: opt-in `@property`
  registration of written `--live-*` values, so they interpolate (consumers add
  `transition` / `@keyframes`) and resolve to a guaranteed `0` initial. It is
  feature-detected, idempotent, and uses `inherits: true`; sources may declare
  per-property `props` typings (default `<number>` / `0`), and consumers may set
  initial values in the same call with `configure({ typed: true, defaults: {…} })`.
- `llms.txt`: a dense, agent-oriented reference, now included in the published package.
- **`field`** is now container-aware: attach it to a wrapper and it finds the inner
  `input` / `textarea` / `select`, writing `--live-length` / `--live-empty` /
  `--live-valid` on the **container** so sibling readers (a counter, a meter, a
  status word) inherit them. Attaching directly to the field still works.
- **`media`** is now container-aware too: attach it to a wrapper and it finds the
  inner `video` / `audio`, writing `--live-progress` / `--live-current-time` /
  `--live-duration` / `--live-paused` / `--live-volume` on the **container** so
  sibling readers (a progress ring, a scrubber) inherit them.

### Fixed
- Single shared `requestAnimationFrame` loop now drives the writer and every
  sampler, instead of each source running its own.
- `scroll-velocity` idles when the page isn't scrolling, instead of polling every
  frame.
- `fps` now reports a smoothed average rather than a jittery per-frame value.
- `clock` no longer drifts: it's anchored to wall-clock time each tick.
- One shared `pointermove` listener now feeds both `pointer` and `pointer-local`.
- A failing source is isolated: it no longer takes down other sources or the loop.
- Written custom properties are removed on teardown.
- Disposers tear down only what their call started, leaving other bindings intact.

## [0.1.0]

### Added
- Initial release. Batched, diffed `requestAnimationFrame` writer.
- Core sources: `viewport`, `scroll`, `pointer`, `size`, `visibility`, `range`.
- Entries: `prop-for-that` (API), `prop-for-that/auto` (`[data-prop]` scanning),
  `prop-for-that/head` (sync FOUC-safe `--const-*`).
- 14 opt-in plugins under `prop-for-that/plugins` (`scroll-velocity`, `online`,
  `network`, `battery`, `clock`, `fps`, `visual-viewport`, `el-scroll`,
  `pointer-local`, `media`, `field`, `orientation`, `motion`, `geo`).
- Build: ESM + CJS + `.d.ts` via tsup; tree-shakeable; zero runtime deps.
