import type { Source } from '../core/types'
import { round4 } from '../core/num'

/**
 * The soft (on-screen) keyboard's geometry, written to `:root`:
 *
 *   - `--live-keyboard-open`   — `1` while the keyboard is showing, else `0`
 *   - `--live-keyboard-height` — its height in px (the bottom inset to avoid)
 *   - `--live-keyboard-width`  — its width in px
 *   - `--live-keyboard-x` / `-y` / `-right` / `-bottom` — its bounding box in
 *     client (viewport) coordinates
 *
 * so layout can reflow around the keyboard with zero JS — e.g.
 * `padding-block-end: calc(var(--live-keyboard-height) * 1px)`.
 *
 * Two engines feed it:
 *
 * - **VirtualKeyboard API** (Chromium / Android) gives the exact `boundingRect`.
 *   It only reports geometry when the page opts the keyboard into *overlaying*
 *   content, so this plugin sets `navigator.virtualKeyboard.overlaysContent =
 *   true` while bound (the browser then stops resizing the viewport for the
 *   keyboard and lets it overlay — a page-wide layout change) and restores the
 *   previous value on dispose.
 * - **`window.visualViewport`** (iOS / Safari and others, where the first API is
 *   absent) — the keyboard height is *inferred* from how much the visual
 *   viewport shrinks (`innerHeight − visualViewport.height − offsetTop`). This is
 *   approximate: a pinch-zoom also shrinks the visual viewport and will read as a
 *   keyboard, and only height/width/box are derived (no true rect).
 *
 * Where neither is available it seeds zeros, so `var(--live-keyboard-height, 0)`
 * resolves everywhere. Global source — bind once.
 */

interface VirtualKeyboardLike {
  overlaysContent: boolean
  boundingRect: DOMRectReadOnly
  addEventListener(type: 'geometrychange', listener: () => void): void
  removeEventListener(type: 'geometrychange', listener: () => void): void
}

/** Below this px delta the visual-viewport shrink is treated as noise, not a keyboard. */
const MIN_KEYBOARD = 1

export const keyboard: Source = {
  key: 'keyboard',
  scope: 'global',
  start(ctx) {
    const write = (x: number, y: number, w: number, h: number, open: boolean) => {
      ctx.write('keyboard-open', open ? 1 : 0)
      ctx.write('keyboard-x', round4(x))
      ctx.write('keyboard-y', round4(y))
      ctx.write('keyboard-width', round4(w))
      ctx.write('keyboard-height', round4(h))
      ctx.write('keyboard-right', round4(x + w))
      ctx.write('keyboard-bottom', round4(y + h))
    }

    const vk = (navigator as Navigator & { virtualKeyboard?: VirtualKeyboardLike })
      .virtualKeyboard
    if (vk) {
      const prevOverlays = vk.overlaysContent
      vk.overlaysContent = true // required for the API to report geometry
      const onGeometry = () => {
        const r = vk.boundingRect
        write(r.x, r.y, r.width, r.height, r.width > 0 && r.height > 0)
      }
      onGeometry() // seed from the current state
      vk.addEventListener('geometrychange', onGeometry)
      return () => {
        vk.removeEventListener('geometrychange', onGeometry)
        vk.overlaysContent = prevOverlays // restore the page's layout mode
      }
    }

    const vvp = typeof window !== 'undefined' ? window.visualViewport : null
    if (vvp) {
      const update = () => {
        const inset = window.innerHeight - vvp.height - vvp.offsetTop
        if (inset > MIN_KEYBOARD) write(0, window.innerHeight - inset, vvp.width, inset, true)
        else write(0, 0, 0, 0, false)
      }
      update() // seed
      vvp.addEventListener('resize', update, { passive: true })
      vvp.addEventListener('scroll', update, { passive: true })
      return () => {
        vvp.removeEventListener('resize', update)
        vvp.removeEventListener('scroll', update)
      }
    }

    write(0, 0, 0, 0, false) // unsupported: seed zeros so var() resolves
    return () => {}
  },
}
