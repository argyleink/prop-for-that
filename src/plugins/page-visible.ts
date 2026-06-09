import type { Source } from '../core/types'
import { onDocument } from '../core/document-events'

/**
 * `--live-page-visible` (1/0) — whether the tab is currently visible
 * (foreground) versus hidden (backgrounded, minimized, or switched away).
 *
 * Distinct from `page-focused`: a *visible* tab can still be *unfocused* (another
 * window holds focus while this one stays on screen). Visibility gates the things
 * that should pause when truly hidden — video, polling, expensive effects — where
 * focus gates the things that react to "is the user looking here right now."
 * Driven by `visibilitychange`, seeded from `document.visibilityState`.
 */
export const pageVisible: Source = {
  key: 'page-visible',
  scope: 'global',
  start(ctx) {
    const update = () =>
      ctx.write('page-visible', document.visibilityState === 'visible' ? 1 : 0)
    update()
    return onDocument('visibilitychange', update)
  },
}
