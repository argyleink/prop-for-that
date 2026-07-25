import type { Source } from '../core/types'
import { resolveTarget } from '../core/find'
import { round4 } from '../core/num'
import { noop } from '../core/noop'
import { onAll } from '../core/events'

/**
 * For `<video>`/`<audio>`: `--live-current-time`, `--live-duration`,
 * `--live-progress` (0–1), `--live-paused` (0/1), `--live-volume` (0–1).
 *
 * Bind it to the media element, or to a container that holds one. When bound to
 * a container the props are written on the container, so sibling readers (a
 * progress ring, a scrubber, a time label) all inherit them.
 */
export const media: Source = {
  key: 'media',
  scope: 'element',
  start(ctx) {
    const el = resolveTarget<HTMLMediaElement>(ctx.target, 'video, audio')
    if (!el) return noop

    const update = () => {
      const duration = isFinite(el.duration) ? el.duration : 0
      ctx.write('current-time', round4(el.currentTime))
      ctx.write('duration', round4(duration))
      ctx.write('progress', duration > 0 ? round4(el.currentTime / duration) : 0)
      ctx.write('paused', el.paused ? 1 : 0)
      ctx.write('volume', round4(el.volume))
    }
    update()
    return onAll(el, ['timeupdate', 'loadedmetadata', 'play', 'pause', 'volumechange'], update)
  },
}
