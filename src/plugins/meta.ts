import type { Source } from '../core/types'

/** A meta tag's `name`/`property` → a safe custom-property name fragment. */
const slug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Every `<meta>` value on the page that JavaScript can read but CSS can't,
 * exposed as write-once `--const-meta-*` properties on `:root`. Each meta with a
 * `name` (or `property`, for Open Graph / Twitter) plus `content` becomes
 * `--const-meta-<slug>`, where the slug lowercases the name and turns any run of
 * non-alphanumerics into a single dash:
 *
 *   <meta name="theme-color" content="#3367d6">         → --const-meta-theme-color
 *   <meta property="og:image" content="/cover.jpg">     → --const-meta-og-image
 *   <meta name="color-scheme" content="dark light">     → --const-meta-color-scheme
 *
 * so CSS can read page metadata directly:
 *
 *   .bar  { background: var(--const-meta-theme-color); }
 *   .hero { background-image: url(var(--const-meta-og-image)); }
 *   @container style(--const-meta-color-scheme: dark) { … }
 *
 * **First match wins** for a repeated name, and a meta with a `media` attribute
 * is skipped when that query doesn't currently match — so the *active*
 * `theme-color` variant (light vs dark) is the one written. Values are read once
 * at bind on the `const` cadence (these don't change), so meta tags a framework
 * swaps in *after* bind aren't tracked; for a value needed before first paint,
 * read it in a `<head>` script instead. Global source — bind once.
 */
export const meta: Source = {
  key: 'meta',
  scope: 'global',
  start(ctx) {
    if (typeof document === 'undefined') return () => {}

    const seen = new Set<string>()
    const nodes = document.querySelectorAll<HTMLMetaElement>('meta[name], meta[property]')
    for (const el of nodes) {
      const raw = el.getAttribute('name') ?? el.getAttribute('property')
      const content = el.getAttribute('content')
      if (!raw || !content) continue
      // media-conditional metas (e.g. theme-color light/dark): skip the variants
      // that don't apply right now, so the matching one is the one that lands.
      const media = el.getAttribute('media')
      if (media && typeof matchMedia === 'function' && !matchMedia(media).matches) continue
      const name = slug(raw)
      if (!name || seen.has(name)) continue // first match wins
      seen.add(name)
      ctx.write('meta-' + name, content, 'const')
    }
    return () => {}
  },
}
