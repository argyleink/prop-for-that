import { test, expect } from '@playwright/test'

/**
 * The `truncated` plugin reports whether an element's text is clipped, from
 * `scrollWidth > clientWidth` (inline / ellipsis) and `scrollHeight > clientHeight`
 * (block / line-clamp). jsdom has no layout — every size getter is `0` — so the
 * premise that those comparisons actually flip under real ellipsis truncation,
 * and clear again when the box grows, can only be proven in a real engine. The
 * unit suite covers the source's logic against stubbed sizes; this covers the
 * platform behavior it rides on, plus the `@container style()` round-trip it's for.
 */

/** Match the source's measurement so the e2e tracks what it actually computes. */
const measure = `(el) => ({
  x: el.scrollWidth > el.clientWidth ? 1 : 0,
  y: el.scrollHeight > el.clientHeight ? 1 : 0,
})`

test('inline (ellipsis) truncation reads as clipped, and clears when the box widens', async ({
  page,
}) => {
  await page.setContent(`
    <p id="clip" style="inline-size: 80px; white-space: nowrap; overflow: hidden;
       text-overflow: ellipsis; font: 16px sans-serif; margin: 0;">
      A line far too long to ever fit inside eighty pixels
    </p>
    <p id="fit" style="inline-size: 800px; white-space: nowrap; overflow: hidden;
       text-overflow: ellipsis; font: 16px sans-serif; margin: 0;">short</p>
  `)

  const r = await page.evaluate((m) => {
    const measure = eval(m) as (el: Element) => { x: number; y: number }
    const clip = document.getElementById('clip')!
    const fit = document.getElementById('fit')!
    const clipped = measure(clip)
    // widen the clipped element past its content; truncation should resolve
    ;(clip as HTMLElement).style.inlineSize = '800px'
    const widened = measure(clip)
    return { clipped, fit: measure(fit), widened }
  }, measure)

  expect(r.clipped.x).toBe(1) // narrow box cuts the line → inline clip
  expect(r.fit.x).toBe(0) // wide box, short text → no clip
  expect(r.widened.x).toBe(0) // grew to fit → flips back off
})

test('block (line-clamp) truncation reads as clipped on the block axis', async ({ page }) => {
  await page.setContent(`
    <p id="clamp" style="inline-size: 200px; display: -webkit-box; -webkit-box-orient: vertical;
       -webkit-line-clamp: 2; overflow: hidden; font: 16px/1.4 sans-serif; margin: 0;">
      Several sentences of body copy that wrap onto well more than two lines, so the
      clamp has to hide the overflowing remainder below the visible two-line window.
    </p>
  `)

  const r = await page.evaluate((m) => {
    const measure = eval(m) as (el: Element) => { x: number; y: number }
    return measure(document.getElementById('clamp')!)
  }, measure)

  expect(r.y).toBe(1) // lines run past the clamped height → block clip
  expect(r.x).toBe(0) // wraps within its width → no inline clip
})

/**
 * The discrete `--live-truncated` flag is meant to drive whole CSS rules via
 * `@container style()`. Chromium has shipped custom-property style queries;
 * support varies in firefox/webkit's bundled builds, so this one is chromium-only.
 */
test('--live-truncated drives @container style()', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'style queries vary by engine version in bundled browsers')
  await page.setContent(`
    <div id="box"><button id="more"></button></div>
    <style>
      #more::after { content: 'less'; }
      @container style(--live-truncated: 1) { #more::after { content: 'more'; } }
    </style>
  `)
  await page.evaluate(() => document.getElementById('box')!.style.setProperty('--live-truncated', '1'))
  const content = await page.evaluate(
    () => getComputedStyle(document.getElementById('more')!, '::after').content,
  )
  expect(content).toContain('more')
})
