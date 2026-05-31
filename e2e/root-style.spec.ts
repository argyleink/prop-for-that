import { test, expect } from '@playwright/test'

/**
 * Global (`:root`) live values are authored into one adopted, constructable
 * stylesheet rule instead of the `<html>` element's inline `style`. That keeps
 * the inline `style` attribute — and the DevTools Styles `element.style {}`
 * block — from mutating under per-frame churn, while the rule still inherits to
 * descendants through the normal cascade. jsdom proves neither half (it has no
 * constructable stylesheets), so this lives here.
 */
test('an adopted :root rule inherits to descendants and leaves <html> inline style clean', async ({
  page,
}) => {
  await page.setContent('<div id="child">x</div>')
  const r = await page.evaluate(() => {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(':root{}')
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
    const ruleStyle = (sheet.cssRules[0] as CSSStyleRule).style
    ruleStyle.setProperty('--live-pointer-x', '123')
    return {
      inherited: getComputedStyle(document.getElementById('child')!)
        .getPropertyValue('--live-pointer-x')
        .trim(),
      rootInline: document.documentElement.getAttribute('style') ?? '',
    }
  })
  expect(r.inherited).toBe('123') // value cascades down to descendants
  expect(r.rootInline).not.toContain('--live-') // never written to inline style
})
