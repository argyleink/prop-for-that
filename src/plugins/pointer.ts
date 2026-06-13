import type { Source } from '../core/types'
import { onWindow } from '../core/window-events'
import { round4 } from '../core/num'

/**
 * `--live-pointer-x/y` (px) and `--live-pointer-x/y-ratio` (0–1 across viewport),
 * written to `:root`.
 *
 * High-frequency (a write per `pointermove`), so it's an opt-in plugin rather
 * than a core source: import it from `prop-for-that/plugins`, or — under `auto`
 * — request it declaratively (`<html data-props-for="pointer">`) and it's
 * loaded on demand.
 */
export const pointer: Source = {
  key: 'pointer',
  scope: 'global',
  start(ctx) {
    const onMove = (e: Event) => {
      const p = e as PointerEvent
      ctx.write('pointer-x', p.clientX)
      ctx.write('pointer-y', p.clientY)
      ctx.write('pointer-x-ratio', round4(p.clientX / window.innerWidth))
      ctx.write('pointer-y-ratio', round4(p.clientY / window.innerHeight))
    }
    // shared with pointer-local: one window pointermove listener for the page
    return onWindow('pointermove', onMove)
  },
}
