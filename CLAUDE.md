# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`prop-for-that` exposes runtime state that JavaScript can read but CSS can't (slider
values, pointer position, element visibility, battery, network, sensors…) as **batched,
diffed CSS custom properties**. Sources write into `--live-*` (continuously updated) or
`--const-*` (write-once) properties; CSS then composes them with `calc()`/`var()`.
Zero runtime dependencies, TypeScript, ESM + CJS, MIT.

## Commands

Run from the repo root (the library). `demos/` and `docs/` are separate packages with
their own `node_modules` and scripts.

```bash
npm run build          # tsup → dist/ (esm + cjs + .d.ts, minified, tree-shaken)
npm run dev            # tsup --watch
npm run typecheck      # tsc --noEmit
npm test               # vitest run (jsdom unit tests in test/)
npm run test:watch     # vitest
npm run test:e2e       # playwright (e2e/, real Chromium/Firefox/WebKit)

# single unit test
npx vitest run test/writer.test.ts
npx vitest run -t "batches"
# single e2e test / one engine
npx playwright install            # once
npx playwright test --project=chromium

# demos (vite, aliased to src/ — no build needed) and docs (astro starlight)
cd demos && npm run dev
cd docs && npm run dev
```

The unit suite (`test/**/*.test.ts`) runs in jsdom. The e2e suite (`e2e/**/*.spec.ts`)
exists because **jsdom can't prove the core premise** — that `setProperty('--live-*')`
round-trips through `var()`/`calc()` and inherits to descendants in a real engine. Keep
that boundary: platform-behavior assertions belong in `e2e/`, logic in `test/`.

## Architecture

Everything funnels through one shared frame loop and one batched writer. The flow is
**source → `ctx.write` → Writer queue → single rAF flush → `setProperty`**.

- **`src/core/frame.ts`** — the *single* `requestAnimationFrame` for the whole library.
  Per-frame samplers (`onFrame`) run first, then the Writer's flush. The loop idles when
  nothing is sampling and nothing is pending; `requestTick()` wakes it for a one-shot
  flush. Continuous samplers keep it alive until disposed.
- **`src/core/writer.ts`** — batched, diffed custom-property writer. `set()` coalesces
  per element+prop and **diffs against the last written value**, so `setProperty` only
  fires on real change, once per frame max. Redundant sets don't even wake a frame.
- **`src/core/observers.ts`** / **`window-events.ts`** — exactly **one** `ResizeObserver`
  and **one** `IntersectionObserver` page-wide, dispatched per element via `WeakMap`; and
  ref-counted passive `window` listeners (one real listener per event type). N bound
  elements ≠ N observers/listeners.
- **The read/write split is load-bearing**: sources *read* layout in their event/observer
  callbacks (post-layout, cheap) and *write* in the rAF flush. Never read computed layout
  during a flush — it reintroduces the thrash this design avoids.

### Sources (the extension point)

A `Source` is `{ key, scope: 'global' | 'element', props?, start(ctx) → Disposer }`
(`src/core/types.ts`). `start` attaches listeners/observers, **seeds initial values** so
props exist on frame one, and returns a disposer that tears down everything it created.
It writes via `ctx.write(localName, value, cadence?)` — `localName` is prefixed by cadence
(`'live'` → `config.livePrefix`, `'const'` → `config.constPrefix`).

- **Core sources** (`src/sources/`, always registered): `viewport`, `pointer` (global);
  `size`, `visibility`, `range` (element). Shipped in the main bundle.
- **Plugins** (`src/plugins/`, opt-in, tree-shakeable): imported from `prop-for-that/plugins`
  and registered explicitly (`register(source)` / `registerPlugins(...)`). They stay out of
  the core bundle so you only ship what you register.

To **add a source**: create the file, follow the existing pattern (use the shared
`observeResize`/`observeIntersection`/`onWindow`/`onFrame` helpers — never `new
ResizeObserver` or a raw `addEventListener` directly), seed initial values in `start`,
round numbers via `src/core/num.ts`. Register it in `src/sources/index.ts` (core) or
`src/plugins/index.ts` (plugin, also export it and add to `allPlugins`). Add it to
the README tables.

### Entry points (`exports` in package.json)

- **`.` (`src/index.ts`)** — imperative API: `propsFor`, `configure`, `register`,
  `unregister`, `unbind`, `reset`. Holds the source **registry** and the
  `target → key → binding` map. `propsFor(keys)` is global (writes to `config.root`);
  `propsFor(target, keys)` is element-scoped. Every call returns a disposer that removes
  **exactly** what it started, including the written properties.
- **`./auto` (`src/auto.ts`)** — zero-config side-effect entry. Attaches `DEFAULT_GLOBALS`
  (`viewport pointer`) and binds `[data-props-for="key1 key2"]` elements, kept in sync with the
  DOM via a single `MutationObserver`. Tracks per-element keys so it only touches the delta
  and never clobbers imperatively-added bindings.
- **`./head` (`src/head.ts`)** — synchronous, FOUC-safe constants for inline use in
  `<head>`. Writes `--const-scrollbar-w`, `--const-scrollbar-thin-w`, `--const-dpr`, `--const-cores` immediately,
  **bypassing the rAF writer on purpose** (these affect first paint).
- **`./plugins` (`src/plugins/index.ts`)** — the opt-in plugin catalog.

`auto` and `head` are the only entries marked `sideEffects` in package.json; keep the rest
side-effect-free so tree-shaking works.

### Conventions that matter

- **SSR-safe**: guard browser globals (`typeof document`, `typeof requestAnimationFrame`,
  feature-detect `CSS.registerProperty`). `config.root` is `undefined` without a document;
  the code handles that path.
- **ASCII prefixes are deliberate.** `--live-`/`--const-` avoid CSS tokenizer escaping
  (sigils like `$`/`#`/`-->` would need `var(--\$x)` or break as CDC tokens). Don't switch
  to sigil-based names — `e2e/naming.spec.ts` guards this.
- **`data-props-for` / `propsFor` keys use the dashed form** of multi-word sources:
  `scroll-velocity`, `pointer-local`, `visual-viewport`.
- **Cadence**: reactive values are `'live'`; values written once are `'const'`.
- **Typed `@property`** is opt-in via `configure({ typed: true })` (+ optional `defaults`);
  it makes `--live-*` interpolatable. Off by default. See `src/core/property.ts`.
- **Sensor/permission-gated sources** (`orientation`, `motion`, `geo`) must feature-detect
  and no-op when unavailable.

## Versioning

On every change to the library (anything under `src/`, the public API, or `dist` output),
bump `package.json` `version` and add a `CHANGELOG.md` entry. This is a `0.x` package, so
treat a **minor** bump as the breaking-change signal (minor = breaking, patch = additive/fix).
