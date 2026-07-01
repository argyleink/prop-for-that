import { describe, it, expect, afterEach, vi } from 'vitest'
import { readUA } from '../src/core/ua'

/**
 * `readUA()` is pure derivation logic — given `navigator.userAgentData` (UA
 * Client Hints) or a `navigator.userAgent` string, produce the low-entropy
 * facts. That's testable in jsdom by stubbing `navigator`; the platform behaviour
 * (does a real engine populate `userAgentData`?) isn't ours to assert here.
 */
const withNavigator = (nav: unknown) => vi.stubGlobal('navigator', nav)

afterEach(() => vi.unstubAllGlobals())

describe('readUA: UA Client Hints (Chromium)', () => {
  it('picks the named brand over GREASE + generic Chromium', () => {
    withNavigator({
      userAgentData: {
        mobile: false,
        platform: 'macOS',
        brands: [
          { brand: 'Not;A=Brand', version: '99' },
          { brand: 'Chromium', version: '124' },
          { brand: 'Google Chrome', version: '124' },
        ],
      },
    })
    expect(readUA()).toEqual({
      platform: 'macos',
      browser: 'chrome',
      engine: 'blink',
      version: 124,
      mobile: 0,
    })
  })

  it('surfaces Edge, and maps mobile + platform', () => {
    withNavigator({
      userAgentData: {
        mobile: true,
        platform: 'Android',
        brands: [
          { brand: 'Chromium', version: '124' },
          { brand: 'Microsoft Edge', version: '124' },
        ],
      },
    })
    const ua = readUA()
    expect(ua.browser).toBe('edge')
    expect(ua.platform).toBe('android')
    expect(ua.mobile).toBe(1)
  })
})

describe('readUA: userAgent-string fallback (Firefox / Safari)', () => {
  it('parses Firefox on macOS as gecko', () => {
    withNavigator({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
    })
    expect(readUA()).toEqual({
      platform: 'macos',
      browser: 'firefox',
      engine: 'gecko',
      version: 120,
      mobile: 0,
    })
  })

  it('parses Safari on iPhone as webkit + mobile', () => {
    withNavigator({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
    })
    expect(readUA()).toEqual({
      platform: 'ios',
      browser: 'safari',
      engine: 'webkit',
      version: 17,
      mobile: 1,
    })
  })

  it('does not misread Edge/Opera UAs as Chrome', () => {
    withNavigator({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 OPR/110.0.0.0',
    })
    const ua = readUA()
    expect(ua.browser).toBe('opera')
    expect(ua.platform).toBe('windows')
    expect(ua.engine).toBe('blink')
  })
})

describe('readUA: SSR / unknown', () => {
  it('returns all-unknown without a navigator', () => {
    withNavigator(undefined)
    expect(readUA()).toEqual({
      platform: 'unknown',
      browser: 'unknown',
      engine: 'unknown',
      version: 0,
      mobile: 0,
    })
  })
})
