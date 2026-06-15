import type { Source } from '../core/types'
import { resolveTarget } from '../core/find'

/**
 * For `<img>`: `--live-natural-w` / `--live-natural-h` (intrinsic pixel size),
 * `--live-loaded` (0/1), `--live-broken` (0/1).
 *
 * Bind it to the image, or to a container that holds one. When bound to a
 * container the props land on the container, so a wrapper/figure can react —
 * skeleton while loading, fallback when broken, `aspect-ratio` from the natural
 * dimensions before the bytes arrive.
 */
export const img: Source = {
  key: 'img',
  scope: 'element',
  // Event-driven (`load`/`error`), and its props (natural size, loaded/broken)
  // are most useful *before* the element scrolls into view — reserving
  // aspect-ratio, showing a skeleton. Gating would withhold them until the image
  // is on screen, defeating the point, so run ungated (unlike the heavy
  // `img-color`, which stays gated to defer its canvas decode).
  gate: false,
  start(ctx) {
    const el = resolveTarget<HTMLImageElement>(ctx.target, 'img')
    if (!el) return () => {}

    const hasSrc = () =>
      el.getAttribute('src') !== null || el.getAttribute('srcset') !== null
    // An image that already failed before we attached won't re-fire `error`.
    let errored = el.complete && el.naturalWidth === 0 && hasSrc()

    const update = () => {
      ctx.write('natural-w', el.naturalWidth)
      ctx.write('natural-h', el.naturalHeight)
      ctx.write('loaded', el.complete && el.naturalWidth > 0 ? 1 : 0)
      ctx.write('broken', errored ? 1 : 0)
    }
    const onLoad = () => {
      errored = false
      update()
    }
    const onError = () => {
      errored = true
      update()
    }
    update() // seed (covers cached images that won't re-fire load/error)
    el.addEventListener('load', onLoad, { passive: true })
    el.addEventListener('error', onError, { passive: true })
    return () => {
      el.removeEventListener('load', onLoad)
      el.removeEventListener('error', onError)
    }
  },
}
