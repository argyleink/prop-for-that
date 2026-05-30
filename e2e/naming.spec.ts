import { test, expect } from '@playwright/test'

/**
 * The library's whole premise: state written via `setProperty('--live-*' / '--const-*')`
 * round-trips through `var()` / `calc()` in a real engine. Plain ASCII prefixes
 * need no escaping, so this should hold everywhere.
 */
test('custom properties round-trip: setProperty -> computed -> var()/calc()', async ({ page }) => {
  await page.setContent('<div id="t"></div>')
  const r = await page.evaluate(() => {
    const el = document.getElementById('t')!
    el.style.setProperty('--live-value-pct', '0.5')
    el.style.setProperty('--const-scrollbar-w', '15')
    el.style.setProperty('--live-pointer-x-ratio', '0.25')
    el.style.width = 'calc(var(--live-value-pct) * 200px)'
    el.style.opacity = 'var(--live-pointer-x-ratio)'
    const cs = getComputedStyle(el)
    return {
      live: cs.getPropertyValue('--live-value-pct').trim(),
      konst: cs.getPropertyValue('--const-scrollbar-w').trim(),
      width: cs.width,
      opacity: cs.opacity,
    }
  })
  expect(r.live).toBe('0.5')
  expect(r.konst).toBe('15')
  expect(r.width).toBe('100px') // 0.5 * 200
  expect(r.opacity).toBe('0.25')
})

/**
 * Element-scoped sources write their props on the bound element; descendants
 * inherit them (custom properties inherit downward). Verify in a real engine.
 */
test('element-scoped custom properties inherit to descendants', async ({ page }) => {
  await page.setContent('<div id="wrap"><span id="child">x</span></div>')
  const v = await page.evaluate(() => {
    document.getElementById('wrap')!.style.setProperty('--live-value', '42')
    return getComputedStyle(document.getElementById('child')!)
      .getPropertyValue('--live-value')
      .trim()
  })
  expect(v).toBe('42')
})

/**
 * Discrete values drive `@container style()`. Chromium has shipped custom-property
 * style queries; firefox/webkit support varies by Playwright's bundled version,
 * so this one is chromium-only.
 */
test('@container style() matches a custom property value', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'style queries vary by engine version in bundled browsers')
  await page.setContent(`
    <div id="box"><span id="badge"></span></div>
    <style>
      #badge::after { content: 'off'; }
      @container style(--live-on: 1) { #badge::after { content: 'on'; } }
    </style>
  `)
  await page.evaluate(() => document.getElementById('box')!.style.setProperty('--live-on', '1'))
  const content = await page.evaluate(
    () => getComputedStyle(document.getElementById('badge')!, '::after').content,
  )
  expect(content).toContain('on')
})
