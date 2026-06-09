import type { Source } from '../core/types'

/**
 * `--const-nav-type` — how the user arrived at this page, read once from
 * `performance.getEntriesByType('navigation')[0].type`:
 *
 * - `navigate` — a fresh navigation (typed URL, link, form, or script)
 * - `reload` — the page was reloaded
 * - `back_forward` — history traversal (Back/Forward, often a bfcache restore)
 * - `prerender` — the page was prerendered
 *
 * Written once as a string on the `const` cadence, so it pairs with style queries
 * — `@container style(--const-nav-type: reload) { … }` — to branch styling on how
 * the visit started. Falls back to `navigate` where Navigation Timing is absent.
 *
 * Typed (`configure({ typed: true })`) registers it as a `<custom-ident>` so the
 * string survives `@property`. Note it rides the batched writer like any plugin,
 * so it lands the frame *after* bind, not before first paint — for a FOUC-safe,
 * pre-paint constant, read the same value synchronously in a `<head>` script.
 */
export const navType: Source = {
  key: 'nav-type',
  scope: 'global',
  props: { 'nav-type': { syntax: '<custom-ident>', initial: 'navigate' } },
  start(ctx) {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined
    ctx.write('nav-type', nav?.type ?? 'navigate', 'const')
    return () => {}
  },
}
