import type { Source } from '../core/types'
import type { Rgb } from './_color'
import { resolveTarget } from '../core/find'
import { round4 } from '../core/num'
import { palette, SAMPLE, createSampler } from './_color'

/** Read the image's downscaled pixels, preferring an off-main-thread decode. */
async function samplePixels(img: HTMLImageElement): Promise<Uint8ClampedArray | null> {
  const sample = createSampler()
  if (!sample) return null

  // createImageBitmap decodes + resizes off the main thread; fall back to a
  // straight downscaling drawImage where it (or its resize options) is missing.
  let source: CanvasImageSource = img
  let bmp: ImageBitmap | undefined
  if (typeof createImageBitmap === 'function') {
    try {
      bmp = await createImageBitmap(img, {
        resizeWidth: SAMPLE,
        resizeHeight: SAMPLE,
        resizeQuality: 'low',
      })
      source = bmp
    } catch {
      /* some engines reject the resize options — draw the element instead */
    }
  }
  const data = sample(source)
  bmp?.close()
  return data
}

/**
 * A small colour palette extracted from an `<img>`. The **dominant** colour is
 * `--live-img-r` / `--live-img-g` / `--live-img-b` (0–255) plus `--live-img-l`
 * (relative luminance 0–1); four more swatches follow the same `r`/`g`/`b`/`l`
 * shape under a name:
 *
 *   - `--live-img-accent-*` — the most vibrant colour (an extracted accent)
 *   - `--live-img-dark-*`   — the darkest colour that isn't black
 *   - `--live-img-light-*`  — the lightest colour that isn't white
 *   - `--live-img-avg-*`    — the average (mean) of every pixel
 *
 * plus `--live-img-temp` (−1 cool … +1 warm), the image's warm/cool bias.
 * Compose any of them with `rgb()`, and branch on each swatch's `…-l` to pick
 * legible text on top of it:
 *
 *   .card { background: rgb(var(--live-img-r) var(--live-img-g) var(--live-img-b)); }
 *   .tag  { background: rgb(var(--live-img-accent-r) var(--live-img-accent-g) var(--live-img-accent-b)); }
 *   @container style(--live-img-l: 0) { ... }   // or read it with calc()
 *
 * Bind the `<img>` or a container holding one (props land on the container, so a
 * caption or overlay can theme itself from the artwork). Recomputed whenever the
 * image loads, so a `src` swap updates it. Every swatch comes from one bucketing
 * pass over just 16×16 px, offloaded via `createImageBitmap` + `OffscreenCanvas`.
 *
 * Cross-origin images need `crossorigin="anonymous"` **and** permissive CORS
 * headers, else the canvas is tainted and the plugin no-ops (writes nothing, so
 * `var(--live-img-r, …)` fallbacks stay safe). Feature-detects canvas support.
 */
export const imgColor: Source = {
  key: 'img-color',
  scope: 'element',
  start(ctx) {
    const img = resolveTarget<HTMLImageElement>(ctx.target, 'img')
    if (!img) return () => {}
    let disposed = false

    const swatch = (name: string, c: Rgb) => {
      ctx.write(`img-${name}-r`, c.r)
      ctx.write(`img-${name}-g`, c.g)
      ctx.write(`img-${name}-b`, c.b)
      ctx.write(`img-${name}-l`, round4(c.l))
    }

    const compute = async () => {
      if (!img.complete || img.naturalWidth === 0) return // not loaded yet, or broken
      const data = await samplePixels(img).catch(() => null)
      if (disposed || !data) return
      const pal = palette(data)
      if (!pal) return
      // dominant keeps the bare `--live-img-*` names; the rest are qualified
      ctx.write('img-r', pal.dominant.r)
      ctx.write('img-g', pal.dominant.g)
      ctx.write('img-b', pal.dominant.b)
      ctx.write('img-l', round4(pal.dominant.l))
      swatch('accent', pal.accent)
      swatch('dark', pal.dark)
      swatch('light', pal.light)
      swatch('avg', pal.average)
      ctx.write('img-temp', round4(pal.temp))
    }
    compute() // seed from an already-loaded/cached image
    img.addEventListener('load', compute, { passive: true })

    return () => {
      disposed = true
      img.removeEventListener('load', compute)
    }
  },
}
