<div align="center">

# prop-for-that

**Expose what JavaScript knows but CSS can't see — as live CSS custom properties.**

[![npm version](https://img.shields.io/npm/v/prop-for-that?logo=npm&color=cb3837)](https://www.npmjs.com/package/prop-for-that)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/prop-for-that?color=22aa77)](https://bundlephobia.com/package/prop-for-that)
![zero dependencies](https://img.shields.io/badge/dependencies-0-22aa77)
![license MIT](https://img.shields.io/badge/license-MIT-blue)

[**Docs**](https://prop-for-that.netlify.app/docsite/) · [**Demos**](https://prop-for-that.netlify.app/) · [**Changelog**](./CHANGELOG.md)

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
- **Fast by design.** One `requestAnimationFrame` flush per frame, write-on-change diffing, and a single shared `ResizeObserver` / `IntersectionObserver` for the whole page.
- **Ship only what you use.** Five core sources are built in; everything else is an opt-in, tree-shakeable plugin.
- **Plays with the platform.** Opt into typed [`@property`](https://prop-for-that.netlify.app/docsite/concepts/typed-properties/) values for interpolation, or FOUC-safe constants written before first paint.
- **Tiny and dependency-free**, in every bundle format.

## What it can read

**Core** (always on): viewport, pointer, element size, visibility, and `<input type="range">` values.

**Plugins** (opt-in): battery, network, FPS, clock, scroll velocity, device orientation / motion, geolocation, CPU pressure, media playback, form & field state, and dominant + accent colors extracted from images and video — 20+ in all.

→ Every source, every property, and live demos are in the **[docs](https://prop-for-that.netlify.app/docsite/reference/plugins/)**.

## Three entry points

| Import | What it does |
| --- | --- |
| `prop-for-that/auto` | Zero-config: attaches global state and binds every `data-props-for` element, kept in sync with the DOM. |
| `prop-for-that` | Imperative API — `propsFor()`, `register()`, `configure()` — for explicit control and teardown. |
| `prop-for-that/head` | Synchronous, FOUC-safe constants (scrollbar width, DPR, core count) before first paint. |
| `prop-for-that/plugins` | The opt-in plugin catalog. |

Full API and concepts: **[prop-for-that.netlify.app/docsite](https://prop-for-that.netlify.app/docsite/)**.

## License

MIT © [Adam Argyle](https://github.com/argyleink)
