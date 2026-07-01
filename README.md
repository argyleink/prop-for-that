<div align="center">

# prop-for-that

**Expose what JavaScript knows but CSS can't see — as live CSS custom properties.**

[![npm version](https://img.shields.io/npm/v/prop-for-that?logo=npm&color=cb3837)](https://www.npmjs.com/package/prop-for-that)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/prop-for-that?color=22aa77)](https://bundlephobia.com/package/prop-for-that)
![zero dependencies](https://img.shields.io/badge/dependencies-0-22aa77)
![license MIT](https://img.shields.io/badge/license-MIT-blue)

[**Docs**](https://prop-for-that.netlify.app/docsite/) · [**Demos**](https://prop-for-that.netlify.app/) · [**Changelog**](./CHANGELOG.md) · [**llms.txt**](https://prop-for-that.netlify.app/llms.txt)

</div>

---

Sliders, pointer position, element visibility, viewport size, battery, network, sensors — JavaScript can read all of it; CSS can't. **prop-for-that** writes that runtime state into `--live-*` and `--const-*` custom properties — batched and diffed down to one `setProperty` per frame — so your CSS can compose and react to it with plain `calc()` and `var()`.

Zero dependencies. TypeScript. ESM + CJS. SSR-safe.

```bash
npm i prop-for-that
```

## Quick start

```html
<script type="module">import 'prop-for-that/auto'</script>

<input type="range" data-props-for="range" />
```

```css
/* the slider paints itself from its own value — no event listeners, no render loop */
input {
  background: hsl(calc(var(--live-value-pct) * 120) 80% 50%);
}
```

Bind any element with `data-props-for="key …"` and read its `--live-*` properties in CSS. That's the whole idea.

## Why

- **CSS does the work.** No per-element event handlers or render loops — bind once, compose in stylesheets.
- **Fast by design.** One `requestAnimationFrame` flush per frame — idle when nothing changes, frozen while the tab is hidden — plus write-on-change diffing and a single shared `ResizeObserver` / `IntersectionObserver` for the whole page. Continuously-sampling element sources pause while their element is off screen; event-driven ones (form fields, ranges, selects) run ungated.
- **Ship only what you use.** Four lightweight core sources are built in; everything else is an opt-in, tree-shakeable plugin — and under `auto` each plugin loads on demand, the moment a `data-props-for` attribute asks for it.
- **Plays with the platform.** Opt into typed [`@property`](https://prop-for-that.netlify.app/docsite/concepts/typed-properties/) values for interpolation, or FOUC-safe constants written before first paint.
- **Tiny and dependency-free**, in every bundle format.

## What it can read

**Core** (built in): viewport, element size, visibility, and `<input type="range">` values.

**Plugins** (opt-in): pointer position, battery, network, online status, page focus & visibility, navigation type, page meta tags, low-entropy user-agent (OS / browser / engine / version / mobile), FPS, clock, scroll velocity, device orientation / motion, geolocation, CPU pressure, soft-keyboard geometry, media playback, form & field state, select & color-picker values, text-truncation (ellipsis) detection, and dominant + accent colors extracted from images and video — 20+ in all.

→ Every source, every property, and live demos are in the **[docs](https://prop-for-that.netlify.app/docsite/reference/plugins/)**.

## Entry points

| Import | What it does |
| --- | --- |
| `prop-for-that/auto` | Zero-config & declarative: binds every `data-props-for` element — globals included, via `<html data-props-for="…">` — loading plugin sources on demand, kept in sync with the DOM. Use as `<script type="module">`. |
| `prop-for-that` | Imperative API — `propsFor()`, `register()`, `configure()` — for explicit control and teardown. |
| `prop-for-that/head` | Synchronous, FOUC-safe constants (scrollbar width & overlay preference, DPR, core count, device memory, low-entropy user-agent) before first paint. |
| `prop-for-that/plugins` | The opt-in plugin catalog. |

> `auto` sees the **light DOM only** (not shadow roots — bind those with `propsFor(el, …)`), and lazy-loads plugin chunks, so from a CDN use one that serves the `dist` files verbatim (unpkg / jsDelivr), not a rewriting CDN.

Full API and concepts: **[prop-for-that.netlify.app/docsite](https://prop-for-that.netlify.app/docsite/)**.

## For LLMs / AI tools

A condensed, single-file reference — entry points, the full variable catalog, recipes, and gotchas — lives at **[llms.txt](./llms.txt)**, hosted at [prop-for-that.netlify.app/llms.txt](https://prop-for-that.netlify.app/llms.txt) and shipped in the npm package (`node_modules/prop-for-that/llms.txt`).

## License

MIT © [Adam Argyle](https://github.com/argyleink)
