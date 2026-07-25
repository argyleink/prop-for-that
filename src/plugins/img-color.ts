import type { Source } from '../core/types'
import { resolveTarget } from '../core/find'
import { round4 } from '../core/num'
import { noop } from '../core/noop'
import { palette, toHex, colorProp, SAMPLE, createSampler } from './_color'

/** Read the image's downscaled pixels, preferring an off-main-thread decode. */
async function samplePixels(img: HTMLImageElement): Promise<Uint8ClampedArray | null> {
  const sample = createSampler()
  if (!sample) return null // no canvas (SSR / unsupported)

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

type Swatches = Record<string, string | number>

/**
 * Last-computed swatches per image, keyed by the source they came from.
 *
 * Module-scoped on purpose: the viewport gate re-runs `start` on every re-entry,
 * so a per-`start` cache would be empty each time and every scroll-back would
 * re-decode the image. A WeakMap outlives the restarts and dies with the element.
 */
const cache = new WeakMap<HTMLImageElement, { src: string; vals: Swatches }>()

/**
 * A small colour palette extracted from an `<img>`, each swatch a single
 * `#rrggbb` colour you drop straight into `var()`:
 *
 *   - `--live-img`        — the dominant colour (the most common one)
 *   - `--live-img-accent` — the most vibrant colour (an extracted accent)
 *   - `--live-img-dark`   — the darkest colour that isn't black
 *   - `--live-img-light`  — the lightest colour that isn't white
 *   - `--live-img-avg`    — the average (mean) of every pixel
 *
 * plus `--live-img-temp` (−1 cool … +1 warm), the image's warm/cool bias. The
 * pixels are sRGB, so a hex colour is enough — pull whatever channels you need
 * out of it with relative colour syntax or mix it, no separate channel props:
 *
 *   .card { background: var(--live-img); }
 *   .tag  { background: oklch(from var(--live-img-accent) l c h / 50%); }
 *   .text { color: oklch(from var(--live-img) clamp(0, (0.6 - l) * 9, 1) 0 0); } // legible on the bg
 *
 * Bind the `<img>` or a container holding one (props land on the container, so a
 * caption or overlay can theme itself from the artwork). Recomputed whenever the
 * image loads, so a `src` swap updates it. Every swatch comes from one bucketing
 * pass over just 16×16 px, offloaded via `createImageBitmap` + `OffscreenCanvas`.
 *
 * Cross-origin images need `crossorigin="anonymous"` **and** permissive CORS
 * headers, else the canvas is tainted and the plugin no-ops (writes nothing, so
 * `var(--live-img, …)` fallbacks stay safe). Feature-detects canvas support.
 */
export const imgColor: Source = {
  key: 'img-color',
  scope: 'element',
  props: {
    img: colorProp,
    'img-accent': colorProp,
    'img-dark': colorProp,
    'img-light': colorProp,
    'img-avg': colorProp,
    'img-temp': { syntax: '<number>', initial: '0' },
  },
  start(ctx) {
    const img = resolveTarget<HTMLImageElement>(ctx.target, 'img')
    if (!img) return noop
    let disposed = false

    const emit = (vals: Swatches) => {
      for (const name in vals) ctx.write(name, vals[name]!)
    }

    const compute = async () => {
      if (!img.complete || img.naturalWidth === 0) return // not loaded yet, or broken
      const hit = cache.get(img)
      if (hit && hit.src === img.currentSrc) return emit(hit.vals) // unchanged → reuse
      const data = await samplePixels(img).catch(() => null)
      if (disposed || !data) return
      const pal = palette(data)
      if (!pal) return
      const vals: Swatches = {
        img: toHex(pal.dominant), // dominant keeps the bare name
        'img-accent': toHex(pal.accent),
        'img-dark': toHex(pal.dark),
        'img-light': toHex(pal.light),
        'img-avg': toHex(pal.average),
        'img-temp': round4(pal.temp),
      }
      cache.set(img, { src: img.currentSrc, vals })
      emit(vals)
    }
    compute() // seed from an already-loaded/cached image (or replay the cache)
    img.addEventListener('load', compute, { passive: true })

    return () => {
      disposed = true
      img.removeEventListener('load', compute)
    }
  },
}
