import type { Source } from '../core/types'
import { resolveTarget } from '../core/find'
import { palette, toHex, colorProp, createSampler } from './_color'

/**
 * Minimum ms between pixel reads. The video drives the cadence via
 * `requestVideoFrameCallback`; this throttles the *sampling* on top of that so
 * ambient theming updates ~4×/sec instead of at the video's full frame rate —
 * smooth enough to track scene cuts, a fraction of the cost.
 */
const MIN_INTERVAL = 250

type RvfcVideo = HTMLVideoElement & {
  requestVideoFrameCallback?(cb: (now: number) => void): number
  cancelVideoFrameCallback?(handle: number): void
}

/** HTMLMediaElement.HAVE_CURRENT_DATA — a frame is decoded and ready to read. */
const HAVE_CURRENT_DATA = 2

/**
 * The live colours of a playing `<video>`, each a single `#rrggbb` colour: the
 * **dominant** colour as `--live-video`, and the most vibrant **accent** as
 * `--live-video-accent` (it reuses the dominant when a frame is essentially
 * grayscale). The pixels are sRGB, so a hex colour is enough — drop them into
 * `var()` for an ambient glow, scrim, or theme that tracks the footage, and pull
 * channels out with relative colour syntax or mix them, no separate channel props:
 *
 *   .player { box-shadow: 0 0 4rem var(--live-video-accent); }
 *   .scrim  { background: oklch(from var(--live-video) l c h / 50%); }
 *
 * Bind the `<video>` or a container holding one (props land on the container, so
 * a caption or chrome can theme itself from the picture). Both colours come from
 * one 16×16 bucketing pass. Sampling rides `requestVideoFrameCallback` — it fires
 * per *presented* frame and stops when the video is paused, offscreen, or in a
 * background tab, so an idle video costs nothing — and the pixel read is throttled
 * to ~4 Hz on top. The current frame is read from a canvas; falls back to the
 * `timeupdate` event where `requestVideoFrameCallback` is unavailable. A
 * paused/poster frame is seeded on attach.
 *
 * Cross-origin video needs `crossorigin="anonymous"` **and** permissive CORS
 * headers, else the canvas is tainted and the plugin no-ops (writes nothing, so
 * `var(--live-video, …)` fallbacks stay safe). Feature-detects canvas support.
 */
export const videoColor: Source = {
  key: 'video-color',
  scope: 'element',
  props: { video: colorProp, 'video-accent': colorProp },
  start(ctx) {
    const video = resolveTarget<RvfcVideo>(ctx.target, 'video')
    if (!video) return () => {}

    const sample = createSampler()
    if (!sample) return () => {} // no canvas (SSR / unsupported)

    let disposed = false
    let lastSample = -Infinity

    const measure = (now: number) => {
      if (now - lastSample < MIN_INTERVAL) return // throttle to ~4 Hz
      if (video.readyState < HAVE_CURRENT_DATA) return // no frame to read yet
      const data = sample(video)
      if (!data) return // tainted (cross-origin) or empty
      const pal = palette(data)
      if (!pal) return
      lastSample = now
      ctx.write('video', toHex(pal.dominant))
      ctx.write('video-accent', toHex(pal.accent))
    }

    measure(0) // seed from the current frame (covers a paused / poster'd video)

    const rvfc = video.requestVideoFrameCallback?.bind(video)
    if (rvfc) {
      // Re-arm every presented frame; `measure` decides whether to actually read.
      let handle = rvfc(function tick(now) {
        if (disposed) return
        measure(now)
        handle = rvfc!(tick)
      })
      return () => {
        disposed = true
        video.cancelVideoFrameCallback?.(handle)
      }
    }

    // Fallback: no requestVideoFrameCallback (older Firefox / SSR). `timeupdate`
    // fires ~4 Hz while playing, which already matches our cadence.
    let elapsed = 0
    const onTime = () => measure((elapsed += MIN_INTERVAL))
    video.addEventListener('timeupdate', onTime, { passive: true })
    video.addEventListener('loadeddata', onTime, { passive: true })
    return () => {
      disposed = true
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('loadeddata', onTime)
    }
  },
}
