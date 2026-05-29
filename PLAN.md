# prop-for-that — design plan

> A tiny service that exposes things JavaScript knows but CSS can't see — as
> batched, diffed CSS custom properties. CSS gets to compute and react to the
> same runtime state JS has.

## Goal

CSS can already react to a lot (`:hover`, `[open]`, container queries,
`prefers-*`, scroll-driven animations). It **cannot** read arbitrary runtime
values: a range slider's number, the pointer's coordinates, scroll velocity,
battery level, an element's visible ratio, network speed. This library writes
those into custom properties efficiently, so a stylesheet can do:

```css
.fade { opacity: var(--live-visible-ratio); }
.card { transform: rotateX(calc((0.5 - var(--live-pointer-y-ratio)) * 20deg)); }
.knob::after { content: counter(x); counter-reset: x var(--live-value); }
```

## Decisions (locked)

| Area | Decision |
| --- | --- |
| Naming | Readable ASCII prefixes: `--live-*` (reactive), `--const-*` (write-once). Configurable. No sigils, no escaping. |
| Opt-in | **Hybrid**: globals auto-attach on load · elements opt in via `data-prop="…"` · imperative `global()`/`bind()`/`dispose()` API. |
| Scope | **Lean core + plugins**: small core, exotic sources are opt-in imports. |
| Values | Plain **unitless** numbers/strings. No `@property` registration in v1. |
| Lang/dist | TypeScript · ESM + CJS + IIFE(head) · zero runtime deps · MIT. |

### Why ASCII prefixes (the tokenizer footnote)

CSS custom-property names are `<dashed-ident>`s. `$`, `#`, `>` are **not** name
code-points — `--$x` is settable from JS (`setProperty` accepts any `--`-name)
but must be escaped in CSS as `var(--\$x)`. `-->` is worse: it's a **CDC token**
(`<!-- … -->` legacy comment pair). Non-ASCII (≥U+0080, e.g. emoji) *is* valid
unescaped. We chose plain ASCII prefixes to get autocomplete and zero escaping.
A browser round-trip test (`setProperty` ⇄ `var()`) is build step #1 to confirm
across Chromium/Firefox/WebKit.

## Architecture

```
                 sources                       core
  ┌───────────────────────────┐   write()   ┌──────────────────┐
  │ global:  viewport,         │ ─────────►  │  Writer (rAF)    │
  │          pointer           │             │  • coalesce      │  setProperty
  │ element: size, visibility, │             │  • diff vs last  │ ───────────►  :root / el
  │          range             │             │  • 1 flush/frame │
  └───────────────────────────┘             └──────────────────┘
        ▲ shared observers
        │ 1× ResizeObserver, 1× IntersectionObserver, shared passive window listeners
```

### Core pieces

- **`Writer`** — the batched service. `set(target, prop, value)` queues into a
  `Map`; a single `requestAnimationFrame` flush walks the queue, **diffs each
  value against the last written** (`WeakMap<el, Map<prop,value>>`), and only
  calls `setProperty` when it actually changed. One flush per frame, max.
- **`Source`** — `{ key, scope, start(ctx) → disposer }`. A source reads in its
  own event/observer callback (post-layout, cheap reads) and calls `ctx.write`,
  which prefixes the local name by cadence and hands off to the `Writer`. Reads
  happen in callbacks, writes happen in the rAF flush → no read-after-write
  layout thrash.
- **Shared observers** — exactly one `ResizeObserver` and one
  `IntersectionObserver` for the whole page, dispatching by element via
  `WeakMap`; shared passive `window` listeners ref-counted by event type. N bound
  elements ≠ N observers.
- **Config** — `{ livePrefix, constPrefix, root }`, overridable via `configure()`.

### Three ways to use it (hybrid)

```ts
// 1. imperative
import { global, bind, configure } from 'prop-for-that'
global(['viewport', 'pointer'])      // writes to :root
const dispose = bind(slider, ['range'])        // writes to the element
dispose()

// 2. declarative — auto entry scans [data-prop] and watches the DOM
import 'prop-for-that/auto'
// <input type="range" data-prop="range">
// <div data-prop="size visibility">…</div>

// 3. head constants — sync, FOUC-safe, inline in <head>
import 'prop-for-that/head'   // sets --const-scrollbar-w, --const-dpr, …
```

### Head vs deferred (answering "run in head, yea?")

Split by cadence, not by convenience:

- **`--const-*` that affects first paint** (scrollbar width, dpr) → tiny **sync**
  inline snippet in `<head>` so there's no flash. This path bypasses the rAF
  writer and `setProperty`s immediately.
- **Everything reactive** → the deferred/async module. First-frame correctness
  isn't critical for live values, and a blocking script in `<head>` would hurt
  startup. The `Writer` seeds an initial value on `start()` so props exist on
  frame one.

## Source catalog

### Core (v1, in-bundle)
| key | scope | writes (local names) |
| --- | --- | --- |
| `viewport` | global | `vw`, `vh` |
| `pointer` | global | `pointer-x`, `pointer-y`, `pointer-x-ratio`, `pointer-y-ratio` |
| `size` | element | `w`, `h`, `aspect` (ResizeObserver) |
| `visibility` | element | `visible`, `visible-ratio` (IntersectionObserver) |
| `range` | element | `value`, `value-pct` |

### Constants (head/const)
`scrollbar-w`, `dpr`, `cores`, `memory`, `touch-points`, `lang`, feature flags.

### Plugins (opt-in `prop-for-that/plugins`)

Implemented and shipped from `prop-for-that/plugins` (tree-shakeable, register explicitly):

| key | scope | writes (local names) |
| --- | --- | --- |
| `scroll-velocity` | global | `scroll-velocity` (signed px/frame, decays to 0), `scroll-direction` (1/-1/0) |
| `online` | global | `online` (0/1) |
| `network` | global | `net-downlink`, `net-rtt`, `net-save-data` (0/1), `net-type` (slow-2g=1,2g=2,3g=3,4g=4,else 0) |
| `battery` | global | `battery-level` (0–1), `battery-charging` (0/1) |
| `clock` | global | `now` (epoch s), `hours`, `minutes`, `seconds` (1 Hz) |
| `fps` | global | `fps` (rounded) |
| `visual-viewport` | global | `vvp-scale`, `vvp-offset-top`, `vvp-height` |
| `el-scroll` | element | `scroll-top`, `scroll-left`, `scroll-progress-y` (0–1), `scroll-progress-x` (0–1) |
| `pointer-local` | element | `px`, `py` (0–1 in box), `pointer-inside` (0/1) |
| `media` | element | `current-time`, `duration`, `progress` (0–1), `paused` (0/1), `volume` (0–1) |
| `field` | element | `length`, `empty` (0/1), `valid` (0/1) |
| `orientation` | global | `orient-alpha`, `orient-beta`, `orient-gamma` (deg) |
| `motion` | global | `accel-x`, `accel-y`, `accel-z` (m/s², gravity incl.) |
| `geo` | global | `geo-lat`, `geo-lng`, `geo-accuracy` (m) |

> `orientation`, `motion`, and `geo` are sensor/permission-gated: they
> feature-detect and no-op when the API is unavailable, and require a
> user-gesture permission grant on some platforms (notably iOS).

Not yet implemented (future): `light`, `audio` (Web-Audio analyser bins),
`caret`, `children` (count via MutationObserver).

> Deliberately **excluded** (CSS already covers): `:hover`, `:focus-within`,
> `[open]`, `prefers-*`, media/container queries, `env()` safe-area insets, and
> **scroll position/progress** — use native scroll-driven animations
> (`animation-timeline: scroll()`/`view()`), which run on the compositor.
> (Scroll *velocity*/*direction*, which timelines can't express, stay as the
> `scroll-velocity` plugin.)

## Performance principles

1. One `setProperty` batch per frame (rAF), never per-event.
2. Write-on-change only — diff against last written value.
3. Passive listeners; shared observers (1 RO, 1 IO page-wide).
4. Read in callbacks, write in flush → avoid layout thrash.
5. Lazy: only the sources you enable attach anything. Tree-shakeable.
6. High-frequency plugins (`scroll-velocity`, `audio`, `motion`) can opt into
   throttling; the rAF flush already caps write frequency.
7. Cleanup: `dispose()` tears down listeners/observers; `auto` unbinds on
   element removal.

## Project layout

```
src/
  index.ts            public API: configure, global, bind
  auto.ts             auto entry: default globals + [data-prop] scanning (MutationObserver)
  head.ts             sync FOUC-safe constants for <head>
  core/
    types.ts          Source, SourceContext, Disposer, Config
    config.ts         runtime config (prefixes, root)
    writer.ts         batched, diffed rAF writer
    observers.ts      shared ResizeObserver / IntersectionObserver
    window-events.ts  shared ref-counted passive window listeners
  sources/
    index.ts          coreSources registry
    global/{viewport,pointer}.ts
    element/{size,visibility,range}.ts
  plugins/            opt-in exotic sources (v1.1+)
test/
  writer.test.ts      batching + diffing (vitest/jsdom)
  naming.browser.test.ts   setProperty ⇄ var() round-trip (Playwright) — build step #1
```

## Roadmap

- **v0.1** — core spine + 6 core sources + auto + head. Browser naming test.
- **v0.2** — plugins (scroll-velocity, network, battery, el-scroll, pointer-local, media).
- **v0.3** — docs site with live demos; optional `@property` opt-in for animatable values.
- **v1.0** — stable API, full plugin catalog, framework adapter notes.

## Open questions for you

1. Default global set for the `auto` entry — currently `viewport pointer`; leaner/heavier?
2. Prefix strings — keep `--live-`/`--const-`, or namespace harder (`--pft-live-`) to avoid token collisions?
3. Package/scope name on npm — `prop-for-that`, or scoped (`@argyle/prop-for-that`)?
