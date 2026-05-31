/**
 * Where global (`:root`) custom-property writes physically land.
 *
 * Live values written to the document root go into a single rule inside one
 * constructable, adopted stylesheet — *not* the `<html>` element's inline
 * `style`. Writing inline mutates the element's `style` attribute every frame,
 * which makes the DevTools Styles panel (the always-pinned `element.style {}`
 * block) thrash so hard it's unusable, and flashes the Elements tree. Routing
 * the churn into one stylesheet rule keeps the inspected root calm.
 *
 * Inheritance is unchanged: the rule targets `:root`, so descendants still read
 * the values through `var()` / `calc()` exactly as before. This is purely about
 * *where* the property is authored, not whether it cascades.
 *
 * Falls back to the element's inline `style` when constructable stylesheets
 * aren't available (older engines, jsdom, SSR), and for any target that isn't
 * the document root (element-scoped sources stay inline, one declaration each).
 */

// undefined = not yet probed; null = unsupported, use inline.
let ruleStyle: CSSStyleDeclaration | null | undefined

function rootRuleStyle(): CSSStyleDeclaration | null {
  if (ruleStyle !== undefined) return ruleStyle
  ruleStyle = null
  if (
    typeof document === 'undefined' ||
    typeof CSSStyleSheet !== 'function' ||
    !('adoptedStyleSheets' in document)
  ) {
    return ruleStyle
  }
  try {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(':root{}')
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
    ruleStyle = (sheet.cssRules[0] as CSSStyleRule).style
  } catch {
    ruleStyle = null // partial support: leave global writes on inline style
  }
  return ruleStyle
}

/**
 * The `CSSStyleDeclaration` a target's custom properties are written to: the
 * shared `:root` rule for the document root (when supported), else the element's
 * own inline `style`. Used by the Writer's flush and by property cleanup so both
 * touch the same place.
 */
export function styleFor(target: HTMLElement): CSSStyleDeclaration {
  if (typeof document !== 'undefined' && target === document.documentElement) {
    const rule = rootRuleStyle()
    if (rule) return rule
  }
  return target.style
}
