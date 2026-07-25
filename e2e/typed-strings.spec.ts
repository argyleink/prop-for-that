import { test, expect } from '@playwright/test'

/**
 * Two platform behaviours the library now depends on, which jsdom can't prove:
 * how a registered `@property` treats a value its syntax rejects, and what an
 * empty `setProperty` does to a custom property.
 */

/**
 * The reason an undeclared *string* is never registered with `@property`. The
 * `<number>` default rejects a colour, a URL, or any other string, and the
 * declaration is dropped at computed-value time — so the property computes to
 * the registered initial (`0`) rather than the value that was written. That's
 * what silently flattened every `--const-meta-*` under `typed: true`.
 */
test('a registered <number> property discards a string value', async ({ page }) => {
  await page.setContent('<div id="t"></div>')
  const r = await page.evaluate(() => {
    CSS.registerProperty({
      name: '--const-meta-theme-color',
      syntax: '<number>',
      inherits: true,
      initialValue: '0',
    })
    const el = document.getElementById('t')!
    el.style.setProperty('--const-meta-theme-color', '#3367d6')
    return getComputedStyle(el).getPropertyValue('--const-meta-theme-color').trim()
  })
  expect(r).toBe('0') // NOT '#3367d6' — the string never survives
})

/** An unregistered custom property keeps whatever string it's given. */
test('an unregistered custom property keeps a string value', async ({ page }) => {
  await page.setContent('<div id="t"></div>')
  const r = await page.evaluate(() => {
    const el = document.getElementById('t')!
    el.style.setProperty('--const-meta-og-image', '/cover.jpg')
    return getComputedStyle(el).getPropertyValue('--const-meta-og-image').trim()
  })
  expect(r).toBe('/cover.jpg')
})

/**
 * `ctx.write(name, '')` is how a source retracts a value that stopped being
 * meaningful (`select`'s `--live-value-num` when the new option isn't numeric).
 * It relies on CSSOM treating an empty `setProperty` as a removal, so the
 * consumer's `var(--x, fallback)` applies again instead of reading a stale value.
 */
test('writing an empty value removes the property and restores the var() fallback', async ({
  page,
}) => {
  await page.setContent('<div id="t">x</div>')
  const r = await page.evaluate(() => {
    const el = document.getElementById('t')!
    const cs = getComputedStyle(el)
    el.style.setProperty('--live-value-num', '4')
    el.style.setProperty('columns', 'var(--live-value-num, 2)')
    const withValue = cs.columns

    el.style.setProperty('--live-value-num', '') // the retraction
    return {
      withValue,
      afterClear: cs.columns,
      prop: cs.getPropertyValue('--live-value-num').trim(),
    }
  })
  expect(r.withValue).toBe('4')
  expect(r.prop).toBe('') // gone, not left at '4'
  expect(r.afterClear).toBe('2') // the fallback applies again
})
