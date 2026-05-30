# Changelog

All notable changes to **prop-for-that** are recorded here. Format follows
[Keep a Changelog](https://keepachangelog.com/). While the package is `0.x`, a
**minor** bump signals a breaking change and a **patch** bump signals a
backwards-compatible change (semver's `1.0.0`+ rules kick in at v1).

Only the published library (`dist/`) is versioned here; the demo and docs site
are repo-only and not part of the npm package.

## [0.2.0] (unreleased)

### Changed (breaking)
- **`visibility`** now writes binary, scroll-*triggered* state: `--live-visible`
  (`1`/`0`) plus `--live-has-entered` (`1`/`0`, latches on first entry and never
  resets). The continuous `--live-visible-ratio` is **removed**; use native
  `animation-timeline: view()` for continuous scroll-driven effects.
- **`range`** is now container-aware: bind it to a wrapper and it finds the inner
  `<input>`, writing `--live-value` / `--live-value-pct` on the **container** so
  the input and sibling elements (gauges, readouts) can all read the value.

### Removed (breaking)
- **Global `scroll` source** (`--live-scroll-x` / `-y` / `-progress`): superseded
  by native CSS scroll-driven animations (`animation-timeline: scroll()` /
  `view()`), which run on the compositor.
- **`el-scroll` plugin**: superseded by native `scroll(self)` / `scroll(nearest)`
  scroll timelines.

### Added
- `llms.txt`: a dense, agent-oriented reference, now included in the published package.

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
