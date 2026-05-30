# prop-for-that

Expose what JavaScript knows but CSS can't see, as **batched, diffed CSS custom
properties**. Give CSS the runtime state it lacks (slider values, pointer
position, element visibility, viewport, …) and let it compute and react.

```bash
npm i prop-for-that
```

## Use it three ways

**Zero-config.** Auto-attaches global state and binds `data-prop` elements:

```html
<script type="module">import 'prop-for-that/auto'</script>

<input type="range" min="0" max="100" data-prop="range">
<section data-prop="size visibility">…</section>
```

```css
input { background: hsl(calc(var(--live-value-pct) * 120) 80% 50%); }
section { opacity: var(--live-has-entered); }
```

**Imperative.** Explicit control and cleanup:

```js
import { propsFor, configure } from 'prop-for-that'

propsFor(['viewport', 'pointer'])            // → :root
const dispose = propsFor(slider, ['range'])  // → the element
dispose()
```

**Head constants.** Synchronous, FOUC-safe, inline in `<head>`:

```html
<script type="module">import 'prop-for-that/head'</script>
<!-- sets --const-scrollbar-w, --const-dpr, --const-cores before first paint -->
```

## What you get

| Source | Properties |
| --- | --- |
| `viewport` | `--live-vw`, `--live-vh` |
| `pointer` | `--live-pointer-x/y`, `--live-pointer-x/y-ratio` |
| `size` | `--live-w`, `--live-h`, `--live-aspect` |
| `visibility` | `--live-visible`, `--live-has-entered` |
| `range` | `--live-value`, `--live-value-pct` |

`--live-*` updates continuously (one batched `setProperty` flush per frame, only
when a value actually changed). `--const-*` is written once. Values are unitless
numbers; compose them with `calc()` and units in CSS.

## Plugins (opt-in)

Exotic sources live in `prop-for-that/plugins` and are registered explicitly, so
they stay tree-shakeable; you only ship the ones you register:

```js
import { register, propsFor } from 'prop-for-that'
import { battery } from 'prop-for-that/plugins'
register(battery)
propsFor(document.documentElement, ['battery'])
```

```css
.indicator { width: calc(var(--live-battery-level) * 100%); }
```

Register many at once with `registerPlugins(...sources)` (no args = all):

```js
import { registerPlugins, fps, clock } from 'prop-for-that/plugins'
registerPlugins(fps, clock)   // or registerPlugins() for everything
```

| Plugin | Scope | Properties |
| --- | --- | --- |
| `scrollVelocity` | global | `--live-scroll-velocity`, `--live-scroll-direction` |
| `online` | global | `--live-online` |
| `network` | global | `--live-net-downlink`, `--live-net-rtt`, `--live-net-save-data`, `--live-net-type` |
| `battery` | global | `--live-battery-level`, `--live-battery-charging` |
| `clock` | global | `--live-now`, `--live-hours`, `--live-minutes`, `--live-seconds` |
| `fps` | global | `--live-fps` |
| `visualViewport` | global | `--live-vvp-scale`, `--live-vvp-offset-top`, `--live-vvp-height` |
| `pointerLocal` | element | `--live-px`, `--live-py`, `--live-pointer-inside` |
| `media` | element | `--live-current-time`, `--live-duration`, `--live-progress`, `--live-paused`, `--live-volume` |
| `field` | element | `--live-length`, `--live-empty`, `--live-valid` |
| `orientation` | global | `--live-orient-alpha/beta/gamma` |
| `motion` | global | `--live-accel-x/y/z` |
| `geo` | global | `--live-geo-lat/lng/accuracy` |

`orientation`, `motion`, and `geo` are sensor/permission-gated: they
feature-detect and no-op when unavailable, and may need a user-gesture
permission grant (notably on iOS). The key string for `propsFor`/`data-prop`
is the dashed form (e.g. `'scroll-velocity'`, `'pointer-local'`,
`'visual-viewport'`).

## How it stays cheap

One `requestAnimationFrame` flush per frame, write-on-change diffing, passive
listeners, and a single shared `ResizeObserver` / `IntersectionObserver` for the
whole page. Tree-shakeable: you only ship the sources you use.

See [`llms.txt`](./llms.txt) for an agent-oriented reference.

## License

MIT
