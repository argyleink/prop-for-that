import type { Source } from '../core/types'
import { readUA } from '../core/ua'

/**
 * `--const-ua-*` — low-entropy device & browser identity JS can read but CSS
 * can't, written **once** as strings/numbers on the `const` cadence:
 *
 * - `--const-ua-platform` — `macos` / `windows` / `linux` / `android` / `ios` /
 *   `chromeos` / `unknown`
 * - `--const-ua-browser` — `chrome` / `edge` / `firefox` / `safari` / `opera` /
 *   `samsung` / `unknown`
 * - `--const-ua-engine` — `blink` / `gecko` / `webkit` / `unknown`
 * - `--const-ua-version` — the browser's major version (number, `0` if unknown)
 * - `--const-ua-mobile` — `1` on a phone-class device, else `0`
 *
 * so CSS can branch on the client without JS or a media query —
 * `@container style(--const-ua-engine: webkit) { … }`,
 * `@container style(--const-ua-platform: ios) { … }` — or gate on the version
 * with `calc(var(--const-ua-version))`.
 *
 * Prefers structured UA Client Hints (`navigator.userAgentData`, Chromium) and
 * falls back to a minimal (best-effort) `userAgent`-string sniff on Firefox /
 * Safari. **Low-entropy only** — no high-entropy hints, device model, or full
 * version, so it adds no fingerprinting surface beyond the request headers.
 *
 * Typed (`configure({ typed: true })`) registers the strings as `<custom-ident>`
 * and the numbers as `<integer>` so they survive `@property`. Rides the writer,
 * so it lands the frame *after* bind; the same constants are available before
 * first paint via the `head` entry (`import 'prop-for-that/head'`). Global source
 * — bind once.
 */
export const ua: Source = {
  key: 'ua',
  scope: 'global',
  props: {
    'ua-platform': { syntax: '<custom-ident>', initial: 'unknown' },
    'ua-browser': { syntax: '<custom-ident>', initial: 'unknown' },
    'ua-engine': { syntax: '<custom-ident>', initial: 'unknown' },
    'ua-version': { syntax: '<integer>', initial: '0' },
    'ua-mobile': { syntax: '<integer>', initial: '0' },
  },
  start(ctx) {
    const { platform, browser, engine, version, mobile } = readUA()
    ctx.write('ua-platform', platform, 'const')
    ctx.write('ua-browser', browser, 'const')
    ctx.write('ua-engine', engine, 'const')
    ctx.write('ua-version', version, 'const')
    ctx.write('ua-mobile', mobile, 'const')
    return () => {}
  },
}
