/**
 * Shared, low-entropy User-Agent reading for the `head` constants and the `ua`
 * plugin. Prefers structured UA Client Hints (`navigator.userAgentData`,
 * Chromium) and falls back to a minimal `userAgent`-string sniff for
 * platform / browser / engine / mobile elsewhere (Firefox, Safari).
 *
 * **Low-entropy only** — no `getHighEntropyValues`, no device model, no full
 * version. Everything here is already sent in request headers, so it adds no
 * fingerprinting surface beyond what the server already sees. The high-entropy
 * UA bits are deliberately omitted.
 */

export interface UAInfo {
  /** `macos` / `windows` / `linux` / `android` / `ios` / `chromeos` / `unknown` */
  platform: string
  /** `chrome` / `edge` / `firefox` / `safari` / `opera` / `samsung` / `unknown` */
  browser: string
  /** `blink` / `gecko` / `webkit` / `unknown` */
  engine: string
  /** the browser's major version, `0` if unknown */
  version: number
  /** `1` on a phone-class device, else `0` */
  mobile: number
}

interface UADataBrand {
  brand: string
  version: string
}
interface UAData {
  brands?: UADataBrand[]
  mobile?: boolean
  platform?: string
}

const UNKNOWN: UAInfo = {
  platform: 'unknown',
  browser: 'unknown',
  engine: 'unknown',
  version: 0,
  mobile: 0,
}

/** `navigator.userAgentData.platform` → our platform slug. */
const CH_PLATFORM: Record<string, string> = {
  android: 'android',
  'chrome-os': 'chromeos',
  'chromium-os': 'chromeos',
  ios: 'ios',
  linux: 'linux',
  macos: 'macos',
  windows: 'windows',
}

const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** Map a brand name (UA-CH entry) to our browser slug. Order matters: Edge / */
/* Opera / Samsung brand strings can also mention Chromium. */
function brandToBrowser(name: string): string {
  const b = name.toLowerCase()
  if (b.includes('edge') || b.includes('edg')) return 'edge'
  if (b.includes('opera') || b.includes('opr')) return 'opera'
  if (b.includes('samsung')) return 'samsung'
  if (b.includes('firefox')) return 'firefox'
  if (b.includes('chrome') || b.includes('chromium')) return 'chrome'
  if (b.includes('safari')) return 'safari'
  return 'unknown'
}

/** Structured path — Chromium only, so the engine is always Blink. */
function fromClientHints(d: UAData): UAInfo | null {
  const brands = d.brands
  if (!brands || !brands.length) return null
  // Skip GREASE (randomised "Not;A=Brand" entries), then prefer a named browser
  // over the generic "Chromium" so Edge / Opera / etc. surface instead of it.
  const real = brands.filter((b) => !/not.?a.?brand/i.test(b.brand))
  const pick = real.find((b) => !/chromium/i.test(b.brand)) ?? real[0]
  if (!pick) return null
  return {
    platform: CH_PLATFORM[slug(d.platform ?? '')] ?? 'unknown',
    browser: brandToBrowser(pick.brand),
    engine: 'blink',
    version: parseInt(pick.version, 10) || 0,
    mobile: d.mobile ? 1 : 0,
  }
}

/** Best-effort fallback for engines without UA-CH (Firefox, Safari). */
const BROWSERS: Array<{ id: string; test: RegExp; ver: RegExp }> = [
  { id: 'edge', test: /Edg(?:iOS|A)?\//, ver: /Edg(?:iOS|A)?\/(\d+)/ },
  { id: 'opera', test: /OPR\/|OPiOS\/|Opera\//, ver: /(?:OPR|OPiOS|Opera)\/(\d+)/ },
  { id: 'samsung', test: /SamsungBrowser\//, ver: /SamsungBrowser\/(\d+)/ },
  { id: 'firefox', test: /Firefox\/|FxiOS\//, ver: /(?:Firefox|FxiOS)\/(\d+)/ },
  { id: 'chrome', test: /Chrome\/|CriOS\//, ver: /(?:Chrome|CriOS)\/(\d+)/ },
  { id: 'safari', test: /Safari\//, ver: /Version\/(\d+)/ },
]

function fromUAString(ua: string): UAInfo {
  const platform = /Android/.test(ua)
    ? 'android'
    : /iPhone|iPad|iPod/.test(ua)
      ? 'ios'
      : /Macintosh|Mac OS X/.test(ua)
        ? 'macos'
        : /Windows/.test(ua)
          ? 'windows'
          : /CrOS/.test(ua)
            ? 'chromeos'
            : /Linux/.test(ua)
              ? 'linux'
              : 'unknown'

  const match = BROWSERS.find((b) => b.test.test(ua))
  const browser = match?.id ?? 'unknown'
  const version = match ? parseInt(ua.match(match.ver)?.[1] ?? '', 10) || 0 : 0

  const engine =
    platform === 'ios' // every browser on iOS is WebKit
      ? 'webkit'
      : browser === 'firefox'
        ? 'gecko'
        : browser === 'safari'
          ? 'webkit'
          : browser === 'unknown'
            ? 'unknown'
            : 'blink'

  const mobile = /Mobi|Android|iPhone|iPod/.test(ua) ? 1 : 0

  return { platform, browser, engine, version, mobile }
}

/** Read low-entropy UA facts, preferring Client Hints. SSR-safe. */
export function readUA(): UAInfo {
  if (typeof navigator === 'undefined') return UNKNOWN
  const data = (navigator as Navigator & { userAgentData?: UAData }).userAgentData
  const ch = data ? fromClientHints(data) : null
  return ch ?? fromUAString(navigator.userAgent || '')
}
