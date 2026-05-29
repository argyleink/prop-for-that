import type { Source } from '../../core/types'

/** `--live-pointer-x/y` (px) and `--live-pointer-x/y-ratio` (0–1 across viewport) */
export const pointer: Source = {
  key: 'pointer',
  scope: 'global',
  start(ctx) {
    const onMove = (e: PointerEvent) => {
      ctx.write('pointer-x', e.clientX)
      ctx.write('pointer-y', e.clientY)
      ctx.write('pointer-x-ratio', Math.round((e.clientX / window.innerWidth) * 1e4) / 1e4)
      ctx.write('pointer-y-ratio', Math.round((e.clientY / window.innerHeight) * 1e4) / 1e4)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  },
}
