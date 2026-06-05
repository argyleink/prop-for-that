# Changelog

All notable changes to **prop-for-that** are recorded here. Format follows
[Keep a Changelog](https://keepachangelog.com/). While the package is `0.x`, a
**minor** bump signals a breaking change and a **patch** bump signals a
backwards-compatible change (semver's `1.0.0`+ rules kick in at v1).

Only the published library (`dist/`) is versioned here; the demo and docs site
are repo-only and not part of the npm package.

## [0.6.1]

### Added
- **`--const-mem` head constant** — `prop-for-that/head` now writes
  `navigator.deviceMemory` (approximate device RAM in GiB) alongside the existing
  scrollbar/DPR/core constants. Chromium-only and deliberately coarse (`0.25`–`8`,
  capped for fingerprinting resistance); falls back to `0` where unsupported,
  matching the `--const-cores` pattern.

## [0.6.0]

### Changed
- **`pointer-local` plugin — renamed its emitted properties (breaking).**
  `--live-px` → `--live-local-pointer-x-ratio`, `--live-py` →
  `--live-local-pointer-y-ratio`, `--live-pointer-inside` →
  `--live-local-pointer-inside`. The element-scoped pointer now shares the
  `pointer` namespace with a `local-` qualifier, so the two are distinguishable
  at a glance, and the `-ratio` suffix keeps units honest against the viewport
  `pointer` source (`--live-pointer-x` is pixels; `*-ratio` is 0–1). The global
  `pointer` source's properties are unchanged. Update any CSS reading the old
  names.

## [0.5.2]

### Added
- **`select` plugin** (`prop-for-that/plugins`) — a native `<select>`'s state as
  numbers CSS can't reach: `--live-index` (`selectedIndex`, `-1` if none),
  `--live-option-count`, `--live-index-pct` (0–1), `--live-value-num`
  (`Number(value)`, only when the value is numeric), `--live-selected-count` and
  `--live-selected-pct` (0–1) — the multi-select tally `:checked` can't count.
  Turns a `<select>` into a discrete CSS state machine (slide a segmented
  indicator off `--live-index`) or drives layout off the chosen value. Bind the
  `<select>` or a container.
- **`color-input` plugin** (`prop-for-that/plugins`) — `--live-color`, the colour
  chosen in an `<input type="color">` as one sRGB hex string (CSS otherwise can't
  read it); extract channels with relative colour syntax / `color-mix()`. Typed
  mode registers it `<color>` so a picker can live-theme + interpolate a region
  with zero consumer JS. Bind the input or a container.
- **`field` plugin extended** — the per-reason `ValidityState` flags `:invalid`
  can't distinguish (each 1/0): `--live-value-missing`, `--live-type-mismatch`,
  `--live-pattern-mismatch`, `--live-too-long`, `--live-too-short`,
  `--live-range-underflow`, `--live-range-overflow`, `--live-step-mismatch`,
  `--live-bad-input`, `--live-custom-error`; plus a `maxlength` budget when one is
  set: `--live-remaining` (chars left) and `--live-fill-pct` (0–1) for a pure-CSS
  character counter. The budget props aren't written without a `maxlength`, so
  keep a `var()` fallback.

## [0.5.1]

### Added
- **`data-props-typed` on the root `<html>`** — the markup equivalent of
  `configure({ typed: true })` for the `auto` entry. Read once on load, it
  registers every written `--live-*` as an interpolatable `@property`, so
  HTML-only (`data-props-for`) pages can opt into typed values without touching
  JS. It's a boolean: `@property` is registered per name for the whole document,
  so typing is all-or-nothing and any attribute value is ignored (there's no
  per-key subset, matching the JS API). For per-property initial values, use the
  JS `configure({ defaults })`.

## [0.5.0]

### Changed
- **BREAKING: `imgColor` and `videoColor` now emit single `#rrggbb` colours, not
  RGB channels.** The canvas pixels are sRGB, so a hex colour is sufficient — and
  CSS already extracts whatever channels you need from a colour with relative
  colour syntax (`oklch(from var(--live-img) l c h)`) or `color-mix()`, so sharing
  separate channel props was redundant. This replaces the per-channel `r` / `g` /
  `b` props and the `l` luminance prop:
  - `imgColor`: `--live-img`, `--live-img-accent`, `--live-img-dark`,
    `--live-img-light`, `--live-img-avg` (each was `…-r` / `-g` / `-b` / `-l`).
    `--live-img-temp` is unchanged.
  - `videoColor`: `--live-video`, `--live-video-accent` (each was `…-r/g/b/l`).
  - To pick legible text, derive it from the colour's own lightness instead of a
    luminance prop, e.g. `color: oklch(from var(--live-img) clamp(0, (0.6 - l) * 9, 1) 0 0)`.
- Both sources now declare `@property` specs (`<color>`), so the live colours
  interpolate smoothly under `configure({ typed: true })`.

## [0.4.6]

### Added
- **`videoColor` now also writes a live accent colour** — `--live-video-accent-r`
  / `-g` / `-b` / `-l`, the most vibrant colour of the current frame (reuses the
  dominant when a frame is essentially grayscale). It reuses the same `palette()`
  pass as `imgColor`, so the accent is free beyond a few ops per sample; the plugin
  stays dominant + accent only (no full palette) since a six-swatch extraction
  isn't worth running 4×/second for an ambient glow. The existing
  `--live-video-r/g/b/l` dominant props are unchanged.

### Changed
- Removed the now-unused internal `dominantColor()` from `_color.ts`; `videoColor`
  reads the dominant from `palette()` instead. Internal only — no public API or
  behaviour change.

## [0.4.5]

### Added
- **`imgColor` now extracts a small palette**, not just the dominant colour. Four
  new swatches, each in the same `r` / `g` / `b` (`0`–`255`) + `l` (luminance
  `0`–`1`) shape as the dominant: `--live-img-accent-*` (the most vibrant colour —
  reuses the dominant for a grayscale image), `--live-img-dark-*` (darkest
  non-black), `--live-img-light-*` (lightest non-white), and `--live-img-avg-*`
  (the mean of every pixel, vs the dominant's mode). Plus a scalar
  `--live-img-temp` (`−1` cool … `+1` warm) from the image's red-vs-blue balance.
  All of it falls out of the **same single 16×16 bucketing pass** — no extra image
  reads — so it's barely dearer than before. The existing `--live-img-r/g/b/l`
  dominant props are unchanged.

### Changed
- `_color.ts` gains a shared `buildBuckets()` helper and a `palette()` extractor;
  `dominantColor()` (used by `videoColor`) is refactored onto it with no behaviour
  change, so `videoColor` stays dominant-only and pays nothing for the new palette.

## [0.4.4]

### Added
- **`videoColor` plugin** (`prop-for-that/plugins`, key `video-color`, element).
  The dominant colour of a playing `<video>` — `--live-video-r` / `-g` / `-b`
  (`0`–`255`) plus `--live-video-l` (relative luminance `0`–`1`) — for an ambient
  glow, scrim, or chrome that tracks the picture. Sampling rides
  `requestVideoFrameCallback` (so it stops when the video is paused, offscreen, or
  backgrounded) and is throttled to ~4 Hz on top; it seeds a paused/poster frame
  on attach and falls back to the `timeupdate` event where
  `requestVideoFrameCallback` is unavailable. The current frame is read 16×16 from
  a canvas, reusing `img-color`'s dominant-colour path. Cross-origin video needs
  `crossorigin="anonymous"` + permissive CORS headers, else the canvas is tainted
  and the plugin writes nothing (`var()` fallbacks stay safe). Bind the `<video>`
  or a container holding one.

### Changed
- The shared pixel-sampling + dominant-colour logic now lives in
  `src/plugins/_color.ts`, reused by both `imgColor` and `videoColor`. No
  behaviour change to `imgColor`.

## [0.4.3]

### Added
- **`formState` plugin** (`prop-for-that/plugins`, key `form-state`, element).
  Form-level **validity & completion** that CSS can't compute — `:invalid` matches
  one control, but CSS can't count across a form or gate on "all valid." Bind it to
  a `<form>` (or wrapper) for `--live-field-count` (controls subject to constraint
  validation), `--live-valid-count` / `--live-invalid-count`, `--live-all-valid`
  (`1`/`0` — the submit gate), and `--live-completion` (`0`–`1`: valid required
  controls ÷ required controls). Recomputes on `input`/`change`, and on the frame
  after a `reset`. Pairs with `field-state` (interaction history) and `field`
  (per-field `--live-valid`).
- **`imgColor` plugin** (`prop-for-that/plugins`, key `img-color`, element). The
  **dominant colour** of an `<img>` (CSS can't read pixels): `--live-img-r` /
  `--live-img-g` / `--live-img-b` (`0`–`255`) plus `--live-img-l` (relative
  luminance `0`–`1`, to pick legible text). Sampled 16×16 via `createImageBitmap`
  + `OffscreenCanvas` (decode/downscale off the main thread, ~256 px read back),
  with a `<canvas>` fallback; recomputed on load so a `src` swap updates it. Bind
  the `<img>` or a container holding one. Cross-origin images need
  `crossorigin="anonymous"` + CORS, else the canvas is tainted and the plugin
  writes nothing — so keep a `var()` fallback. Kept separate from `img` so the
  pixel-reading cost is opt-in.

## [0.4.2]

### Fixed
- **`fieldState`**: `--live-changed` now clears correctly after a form `reset`.
  It's recomputed against each control's *default* value synchronously, instead
  of re-read in a microtask — Chromium runs that microtask checkpoint *before* the
  reset event reverts the control values, so `--live-changed` stayed stuck on after
  a reset. `dirty` / `touched` / `submitted` already reset correctly; now `changed`
  does too (handles text inputs, `<textarea>`, `<select>`, and checkbox/radio).

## [0.4.1]

### Added
- **`fieldState` plugin** (`prop-for-that/plugins`, key `field-state`, element).
  The form interaction-history states libraries like Angular, Formik, and React
  Hook Form track but CSS pseudo-classes can't express — all `1`/`0`:
  `--live-dirty` / `--live-pristine` (has the user edited the field at all —
  latches on first `input`/`change`), `--live-touched` / `--live-untouched`
  (blurred at least once — latches on first `blur`), `--live-changed` (current
  value differs from the value at mount — un-latches when typed back), and
  `--live-submitted` (the owning `<form>` has been submitted — latches on
  `submit`, clears on `reset`). Both latch pairs reset when the form is reset.
  Bind a **single field** for that field's state, or a **`<form>` / wrapper** for
  the *aggregate* over every field inside it (dirty/touched/changed if *any*
  field is — like a framework form-group). Props land on the bound element, so a
  label, hint, or submit button can reveal an error or enable only once
  `--live-touched`/`--live-submitted`/`--live-dirty`. Validity stays in the
  `field` plugin; focus stays in `:focus`.

## [0.4.0]

### Added
- **`--const-scrollbar-thin-w`** from the `head` entry: the scrollbar width when
  `scrollbar-width: thin` is applied, measured alongside `--const-scrollbar-w`.
  Falls back to the classic width where `scrollbar-width: thin` isn't supported.
- **`img` plugin** (`prop-for-that/plugins`, key `img`, element). For `<img>`:
  `--live-natural-w` / `--live-natural-h` (intrinsic pixel size), `--live-loaded`
  (`1`/`0`), `--live-broken` (`1`/`0`). Bind the image or a container holding one
  (props land on the container, so a wrapper can show a skeleton while loading, a
  fallback when broken, or set `aspect-ratio` from the natural size). Seeds from
  `complete`/`naturalWidth` so already-cached images report correctly.
- **`cpuPressure` plugin** (`prop-for-that/plugins`, key `cpu-pressure`, global).
  Exposes the CPU's [Compute Pressure](https://developer.mozilla.org/en-US/docs/Web/API/Compute_Pressure_API)
  state as `--live-cpu-pressure`, an ordered tier (nominal=0, fair=1, serious=2,
  critical=3) — use it to back off expensive CSS work as the CPU gets busy.
  Chromium-only, secure-context, and gated by the `compute-pressure` Permissions
  Policy; feature-detects and no-ops (seeding `0` where supported, writing nothing
  where not) so `var(--live-cpu-pressure, 0)` is safe everywhere.

### Changed (breaking)
- **The auto-mode attribute is renamed `data-prop` → `data-props-for`.** The
  zero-config `prop-for-that/auto` entry now scans for, observes, and binds
  `[data-props-for="key1 key2"]` (was `[data-prop]`). Rename the attribute on every
  element: `<div data-prop="size">` → `<div data-props-for="size">`. The value
  syntax is unchanged — one or more space-separated source keys. The imperative
  `propsFor()` API is unaffected.
- **`visibility` is now full-element, and its latch moved off the `live`
  cadence.** Both signals key off *entire-element* containment instead of
  first-pixel overlap, and the write-once latch is renamed:
  - `--live-visible` (1/0) now flips only while the element is **entirely**
    within the viewport (previously: any part overlapping). Still reactive.
  - `--live-has-entered` → **`--const-has-entered`**. It's written once (latches
    to 1 the first time the element is entirely in view, never resets), so it now
    lives on the `const` cadence. Update CSS to read `var(--const-has-entered)`.
  - The shared `IntersectionObserver` gains `threshold: [0, 1]` to detect full
    containment. An element larger than the viewport can never be entirely
    visible, so neither signal ever turns on for it.

## [0.3.0]

### Changed (breaking)
- **Global `--live-*` writes go to an adopted stylesheet, not `<html>` inline
  style.** Values written to the document root through the rAF writer now land in
  a single constructable, adopted stylesheet rule (`:root {}`) instead of the
  `<html>` element's inline `style`. This stops the per-frame churn from making
  the DevTools Styles panel unusable and from flashing the Elements tree.
  **Consumption is unchanged** — the rule targets `:root`, so `var()` / `calc()`
  still inherit and resolve identically. What changes: reading
  `document.documentElement.style.getPropertyValue('--live-*')` directly no longer
  reflects these values (read computed style instead), and their cascade origin
  moves from inline to an author rule (so author CSS / `!important` can now win).
  Falls back to inline style where constructable stylesheets aren't supported
  (older engines, SSR). **Element-scoped** writes are unchanged (still inline), and
  the synchronous `head` entry still writes its `--const-*` constants inline by
  design (first paint).

### Added
- **`pause()` / `resume()`**: freeze the shared frame loop (no sampling, no
  flushing) so live values hold steady — handy for inspecting them in DevTools
  without churn, or halting work in a backgrounded tab — then pick back up.
  Bindings stay attached; both are idempotent.
- **`configure({ liveHz })`**: optional cap (in Hz) on how often the loop samples
  and flushes. Unset (default) runs every animation frame; e.g. `30` coalesces
  writes to ≤30/sec for fewer style recalcs and a calmer DevTools panel, at the
  cost of update smoothness. Throttles the whole loop, so per-frame samplers
  (`fps`, `scroll-velocity`) measure at this rate too.

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
