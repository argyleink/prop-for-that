import type { Source } from '../core/types'

/**
 * For `<video>`/`<audio>`: `--live-current-time`, `--live-duration`,
 * `--live-progress` (0–1), `--live-paused` (0/1), `--live-volume` (0–1).
 */
export const media: Source = {
  key: 'media',
  scope: 'element',
  start(ctx) {
    const el = ctx.target as HTMLMediaElement
    const update = () => {
      const duration = isFinite(el.duration) ? el.duration : 0
      ctx.write('current-time', Math.round(el.currentTime * 1e4) / 1e4)
      ctx.write('duration', Math.round(duration * 1e4) / 1e4)
      ctx.write('progress', duration > 0 ? Math.round((el.currentTime / duration) * 1e4) / 1e4 : 0)
      ctx.write('paused', el.paused ? 1 : 0)
      ctx.write('volume', Math.round(el.volume * 1e4) / 1e4)
    }
    update()
    const events = ['timeupdate', 'loadedmetadata', 'play', 'pause', 'volumechange']
    for (const type of events) el.addEventListener(type, update, { passive: true })
    return () => {
      for (const type of events) el.removeEventListener(type, update)
    }
  },
}
