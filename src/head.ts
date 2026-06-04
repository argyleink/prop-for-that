import { config } from './core/config'

/**
 * Synchronous, FOUC-safe constants. Import (or inline) this in `<head>` so the
 * values exist before first paint. Bypasses the rAF writer on purpose.
 *
 *   import 'prop-for-that/head'  // sets --const-scrollbar-w, --const-dpr, …
 */
function writeConstants(): void {
  const root = config.root
  const set = (name: string, value: string | number) =>
    root.style.setProperty(config.constPrefix + name, String(value))

  // Scrollbar width — JS knows it, CSS historically didn't. Probe a scroller,
  // then re-probe with `scrollbar-width: thin` for the thin variant. (Where thin
  // isn't supported it falls back to the classic width, so the two match.)
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll;visibility:hidden'
  const host = document.body ?? root
  host.appendChild(probe)
  set('scrollbar-w', probe.offsetWidth - probe.clientWidth)
  probe.style.scrollbarWidth = 'thin'
  set('scrollbar-thin-w', probe.offsetWidth - probe.clientWidth)
  probe.remove()

  set('dpr', window.devicePixelRatio || 1)
  set('cores', navigator.hardwareConcurrency || 0)
}

if (typeof document !== 'undefined') writeConstants()
