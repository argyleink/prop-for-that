import { propsFor, unbind, configure, register, isRegistered } from './index'
import { loaders } from './plugins/loaders'

/**
 * Zero-config, fully declarative entry. Import it once — in `<head>` or at the
 * end of the page — and every element carrying `data-props-for="key1 key2"` is
 * bound, kept in sync with the DOM, with no other setup:
 *
 *   <script type="module" src="https://.../prop-for-that/auto.js"></script>
 *
 *   <input type="range" data-props-for="range">
 *   <div data-props-for="size visibility">…</div>
 *   <html data-props-for="viewport pointer">   <!-- globals → :root -->
 *
 * Nothing is attached by default: a page gets exactly the sources it asks for,
 * including globals (declare them on `<html>`). Plugin sources are **loaded on
 * demand** — the first time a `data-props-for` key needs one, its chunk is
 * dynamically imported and registered, then the binding attaches. No
 * `registerPlugins()`, no separate plugins import.
 *
 * Add `data-props-typed` to the root `<html>` to opt the whole document into
 * typed, interpolatable `@property` values — the HTML mirror of
 * `configure({ typed: true })`:
 *
 *   <html data-props-typed>
 */

/** The data-props-for keys auto bound per element, so we touch only the delta and
 *  never clobber bindings added through the imperative API. */
const tracked = new WeakMap<HTMLElement, string[]>()

/** In-flight plugin loads, deduped by key so concurrent requests share a fetch. */
const loading = new Map<string, Promise<void>>()

function keysOf(el: HTMLElement): string[] {
  return (el.dataset.propsFor ?? '').split(/\s+/).filter(Boolean)
}

/**
 * Ensure a source key is registered. Returns null when it's ready now (a core
 * source, or an already-loaded plugin) or genuinely unknown; otherwise a promise
 * that resolves once the on-demand plugin chunk has loaded and registered.
 */
function ensure(key: string): Promise<void> | null {
  if (isRegistered(key)) return null
  const loader = loaders[key]
  if (!loader) return null // unknown key: let propsFor warn at bind time
  let p = loading.get(key)
  if (!p) {
    p = loader()
      .then((source) => {
        register(source)
      })
      .catch((err) => {
        // Drop the cached promise so a later request retries — a transient
        // failure (offline, blocked, flaky CDN) shouldn't wedge the key forever.
        loading.delete(key)
        console.error(`[prop-for-that] failed to load plugin "${key}"`, err)
      })
    loading.set(key, p)
  }
  return p
}

function bindKey(el: HTMLElement, key: string): void {
  const pending = ensure(key)
  if (!pending) {
    propsFor(el, [key]) // ready now (or unknown → warns)
    return
  }
  // attach once the chunk lands — unless the element was removed or the key
  // dropped while it loaded
  pending.then(() => {
    if (isRegistered(key) && (tracked.get(el) ?? []).includes(key)) propsFor(el, [key])
  })
}

function sync(el: HTMLElement): void {
  const next = keysOf(el)
  const prev = tracked.get(el) ?? []
  const removed = prev.filter((k) => !next.includes(k))
  const added = next.filter((k) => !prev.includes(k))
  if (removed.length) unbind(el, removed)
  // record the target state before any async load resolves, so a load that
  // lands later can tell whether its key is still wanted
  if (next.length) tracked.set(el, next)
  else tracked.delete(el)
  for (const key of added) bindKey(el, key)
}

function clear(el: HTMLElement): void {
  const keys = tracked.get(el)
  if (keys) {
    unbind(el, keys)
    tracked.delete(el)
  }
}

function syncTree(node: Node): void {
  if (!(node instanceof HTMLElement)) return
  if (node.hasAttribute('data-props-for')) sync(node)
  node.querySelectorAll<HTMLElement>('[data-props-for]').forEach(sync)
}

function clearTree(node: Node): void {
  if (!(node instanceof HTMLElement)) return
  clear(node)
  node.querySelectorAll<HTMLElement>('[data-props-for]').forEach(clear)
}

function init(): void {
  // Document-level opt-in: `<html data-props-typed>` mirrors `configure({ typed: true })`.
  // Read once, before any source attaches — `@property` registration is global per
  // name, so typing is all-or-nothing for the document (see the typed-properties docs),
  // and `config.typed` must be set before the first write. The attribute is a boolean;
  // any value is ignored (there is no per-key subset, just as there isn't in JS).
  if (document.documentElement.hasAttribute('data-props-typed')) {
    configure({ typed: true })
  }
  document.querySelectorAll<HTMLElement>('[data-props-for]').forEach(sync)

  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.target instanceof HTMLElement) {
        sync(m.target)
        continue
      }
      m.removedNodes.forEach(clearTree)
      m.addedNodes.forEach(syncTree)
    }
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-props-for'],
  })
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }
}
